-- ─── Approvals, phase 2: rounds, withdrawing, versions, and real distribution gating ───────────────────────────────
-- Builds on 20261026_approvals_phase1.sql. After it:
--   * each submission is a numbered round, saved with a hash of the brief's content; a brief that changes after it was
--     submitted or approved automatically supersedes the pending approval and marks earlier approvals out of date;
--   * the person who submitted can withdraw a pending approval, and a brief that asked for changes can be resubmitted
--     from the stage that asked for them (or from stage 1);
--   * with "Block distribution without approval" on, the board refuses to move a brief to Distributed unless it is validly
--     approved, and only an admin can override, with a reason that is recorded.
-- Apply this BEFORE deploying the app version that calls these functions.

-- ─── approvals: rounds, a hash of what was submitted, and whether it is still current ──────────────────────────────
alter table public.approvals
  add column if not exists round        integer not null default 1,
  add column if not exists content_hash text,
  add column if not exists stale        boolean not null default false;

alter table public.approvals drop constraint if exists approvals_status_check;
alter table public.approvals add constraint approvals_status_check
  check (status in ('pending','approved','rejected','changes_requested','withdrawn','superseded'));

alter table public.approval_events add column if not exists round integer not null default 1;
alter table public.approval_events drop constraint if exists approval_events_action_check;
alter table public.approval_events add constraint approval_events_action_check
  check (action in ('requested','approved','rejected','changes_requested','stage_started','withdrawn','superseded'));

-- ─── approval_overrides: every time an admin distributed something that was not approved ───────────────────────────
create table if not exists public.approval_overrides (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null,
  brief_id    text not null,
  card_id     uuid not null,
  actor_id    uuid not null,
  actor_name  text not null,
  reason      text not null,
  blocked_for text not null,
  created_at  timestamptz not null default now()
);

create index if not exists approval_overrides_brief_id_idx on public.approval_overrides (brief_id);

alter table public.approval_overrides enable row level security;

create policy "team members can read approval overrides"
  on public.approval_overrides for select
  using (team_id = public.get_my_team_id());
revoke insert, update, delete, truncate on public.approval_overrides from anon, authenticated;

-- ─── A hash of a brief's content, ignoring its bookkeeping (ids, timestamps, status) ───────────────────────────────
create or replace function public.brief_content_hash(p_data jsonb)
returns text
language sql immutable as $$
  select encode(sha256(convert_to((p_data - 'meta')::text, 'UTF8')), 'hex')
$$;

-- ─── request_approval: submit a brief, or resubmit it after changes were asked for ─────────────────────────────────
-- The brief is read from the briefs table here, not sent by the browser, so what is approved is what is stored.
drop function if exists public.request_approval(text, text, jsonb, jsonb);

create or replace function public.request_approval(
  p_brief_id text, p_email_name text, p_stages jsonb, p_start_stage integer default 1
)
returns public.approvals
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_team  uuid;
  v_name  text;
  v_role  text;
  v_brief jsonb;
  v_stage jsonb;
  v_first jsonb;
  v_days  integer;
  v_total integer;
  v_round integer;
  v_last  public.approvals;
  v_row   public.approvals;
begin
  select team_id, display_name, role into v_team, v_name, v_role from public.profiles where id = v_uid;
  if v_team is null then raise exception 'not_signed_in'; end if;

  if jsonb_typeof(p_stages) is distinct from 'array' or jsonb_array_length(p_stages) = 0 then
    raise exception 'stages_required';
  end if;
  v_total := jsonb_array_length(p_stages);
  if p_start_stage < 1 or p_start_stage > v_total then raise exception 'invalid_start_stage'; end if;

  select data into v_brief from public.briefs
   where team_id = v_team and brief_id = p_brief_id order by created_at desc limit 1;
  if v_brief is null then raise exception 'brief_not_found'; end if;

  if exists (select 1 from public.approvals where team_id = v_team and brief_id = p_brief_id and status = 'pending') then
    raise exception 'approval_already_open';
  end if;

  -- Resuming part-way is only for a brief whose last stage asked for changes.
  select * into v_last from public.approvals
   where team_id = v_team and brief_id = p_brief_id order by round desc, stage desc limit 1;
  if p_start_stage > 1 and (v_last.id is null or v_last.status <> 'changes_requested' or v_last.stage <> p_start_stage) then
    raise exception 'invalid_start_stage';
  end if;

  -- Every stage still to run needs someone who could decide it, other than the person submitting.
  for v_stage in select e.value from jsonb_array_elements(p_stages) as e(value) loop
    if (v_stage->>'stage')::integer >= p_start_stage
       and public.approval_stage_eligible(v_team, v_stage->>'role', nullif(v_stage->>'assignedUserId', '')::uuid, v_uid) = 0 then
      raise exception 'no_approver:%', v_stage->>'role';
    end if;
  end loop;

  select e.value into v_first from jsonb_array_elements(p_stages) as e(value)
   where (e.value->>'stage')::integer = p_start_stage limit 1;
  v_days  := nullif(v_first->>'dueDaysFromRequest', '')::integer;
  v_round := coalesce((select max(round) from public.approvals where team_id = v_team and brief_id = p_brief_id), 0) + 1;

  insert into public.approvals (
    team_id, brief_id, email_name, status, requested_by, requested_by_name,
    approver_role, approver_user_id, due_date, stage, total_stages, stages_snapshot, version_snapshot,
    round, content_hash, stale
  ) values (
    v_team, p_brief_id, p_email_name, 'pending', v_uid, v_name,
    v_first->>'role', nullif(v_first->>'assignedUserId', '')::uuid,
    case when v_days is not null then now() + make_interval(days => v_days) end,
    p_start_stage, v_total, p_stages, v_brief,
    v_round, public.brief_content_hash(v_brief), false
  ) returning * into v_row;

  -- Resuming at stage N: the approvals already given for stages before N are carried forward, as the person resubmitting
  -- is saying the changes do not affect them. Starting from stage 1 asks everyone again.
  if p_start_stage > 1 then
    update public.approvals set stale = false
     where id in (
       select distinct on (a.stage) a.id
         from public.approvals a
        where a.team_id = v_team and a.brief_id = p_brief_id and a.status = 'approved' and a.stage < p_start_stage
        order by a.stage, a.round desc, a.created_at desc);
  end if;

  insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages, comment, round)
  values (v_team, v_row.id, p_brief_id, v_uid, v_name, v_role, 'requested', p_start_stage, v_total,
          case when p_start_stage > 1 then 'Resubmitted at stage ' || p_start_stage || '; earlier approvals carried forward' end,
          v_round);

  return v_row;
end;
$$;

-- ─── decide_approval: as in phase 1, and the next stage stays in the same round with the same hash ─────────────────
create or replace function public.decide_approval(p_id uuid, p_decision text, p_comment text)
returns public.approvals
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team    uuid;
  v_name    text;
  v_role    text;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  a         public.approvals;
  v_next    jsonb;
  v_days    integer;
begin
  select team_id, display_name, role into v_team, v_name, v_role from public.profiles where id = v_uid;
  if v_team is null then raise exception 'not_signed_in'; end if;

  if p_decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;

  select * into a from public.approvals where id = p_id and team_id = v_team for update;
  if not found then raise exception 'approval_not_found'; end if;

  if a.status <> 'pending' then raise exception 'approval_already_decided'; end if;
  if a.requested_by = v_uid then raise exception 'approval_own_request'; end if;

  if not (
    (a.approver_user_id is not null and a.approver_user_id = v_uid)
    or (a.approver_user_id is null and exists (
          select 1 from public.approval_pool_members m
           where m.team_id = a.team_id and m.role = a.approver_role and m.user_id = v_uid))
  ) then
    raise exception 'approval_not_approver';
  end if;

  if p_decision in ('rejected', 'changes_requested') and (v_comment is null or length(v_comment) < 5) then
    raise exception 'comment_required';
  end if;

  update public.approvals
     set status = p_decision, decided_by = v_uid, decided_by_name = v_name,
         decided_at = now(), decision_comment = v_comment
   where id = a.id
   returning * into a;

  insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages, comment, round)
  values (a.team_id, a.id, a.brief_id, v_uid, v_name, v_role, p_decision, a.stage, a.total_stages, v_comment, a.round);

  if p_decision = 'approved' and a.stage < a.total_stages then
    select e.value into v_next
      from jsonb_array_elements(a.stages_snapshot) as e(value)
     where (e.value->>'stage')::integer = a.stage + 1
     limit 1;
    if v_next is null then raise exception 'stage_missing'; end if;

    v_days := nullif(v_next->>'dueDaysFromRequest', '')::integer;

    insert into public.approvals (
      team_id, brief_id, email_name, status, requested_by, requested_by_name,
      approver_role, approver_user_id, due_date, stage, total_stages, stages_snapshot, version_snapshot,
      round, content_hash, stale
    ) values (
      a.team_id, a.brief_id, a.email_name, 'pending', a.requested_by, a.requested_by_name,
      v_next->>'role', nullif(v_next->>'assignedUserId', '')::uuid,
      case when v_days is not null then now() + make_interval(days => v_days) end,
      a.stage + 1, a.total_stages, a.stages_snapshot, a.version_snapshot,
      a.round, a.content_hash, false
    );

    insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages, round)
    select a.team_id, n.id, a.brief_id, v_uid, v_name, v_role, 'stage_started', n.stage, n.total_stages, n.round
      from public.approvals n
     where n.brief_id = a.brief_id and n.team_id = a.team_id and n.stage = a.stage + 1 and n.round = a.round and n.status = 'pending'
     limit 1;
  end if;

  return a;
end;
$$;

-- ─── withdraw_approval: the person who submitted it, or an admin, takes a pending approval back ────────────────────
create or replace function public.withdraw_approval(p_id uuid, p_reason text)
returns public.approvals
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_team   uuid;
  v_name   text;
  v_role   text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  a        public.approvals;
begin
  select team_id, display_name, role into v_team, v_name, v_role from public.profiles where id = v_uid;
  if v_team is null then raise exception 'not_signed_in'; end if;

  select * into a from public.approvals where id = p_id and team_id = v_team for update;
  if not found then raise exception 'approval_not_found'; end if;
  if a.status <> 'pending' then raise exception 'approval_already_decided'; end if;
  if a.requested_by <> v_uid and v_role <> 'admin' then raise exception 'withdraw_not_allowed'; end if;

  update public.approvals
     set status = 'withdrawn', decided_by = v_uid, decided_by_name = v_name, decided_at = now(), decision_comment = v_reason
   where id = a.id
   returning * into a;

  insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages, comment, round)
  values (a.team_id, a.id, a.brief_id, v_uid, v_name, v_role, 'withdrawn', a.stage, a.total_stages, v_reason, a.round);

  return a;
end;
$$;

-- ─── A brief that changes after it was submitted or approved loses its approval ────────────────────────────────────
create or replace function public.supersede_approvals_on_brief_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := coalesce(auth.uid(), new.created_by);
  v_name  text;
  v_role  text;
  r       record;
begin
  -- Only a change to the content counts, not to the brief's ids, timestamps or status.
  if public.brief_content_hash(new.data) is not distinct from public.brief_content_hash(old.data) then
    return new;
  end if;

  select display_name, role into v_name, v_role from public.profiles where id = v_actor;

  for r in select * from public.approvals where team_id = new.team_id and brief_id = new.brief_id and status = 'pending' loop
    update public.approvals
       set status = 'superseded', decided_at = now(), stale = true,
           decision_comment = 'The brief changed after it was submitted.'
     where id = r.id;
    insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages, comment, round)
    values (r.team_id, r.id, r.brief_id, coalesce(v_actor, r.requested_by), coalesce(v_name, 'System'), coalesce(v_role, 'system'),
            'superseded', r.stage, r.total_stages, 'The brief changed after it was submitted.', r.round);
  end loop;

  update public.approvals set stale = true
   where team_id = new.team_id and brief_id = new.brief_id and stale = false;

  return new;
end;
$$;

drop trigger if exists briefs_supersede_approvals on public.briefs;
create trigger briefs_supersede_approvals
  after update of data on public.briefs
  for each row execute function public.supersede_approvals_on_brief_change();

-- ─── Why a brief cannot be distributed, or null if it can ──────────────────────────────────────────────────────────
-- Only applies when the team has switched on "Block distribution without approval", and only to a brief that exists and
-- whose email type has approval stages: a card with no brief, or a type with no stages, needs nothing.
create or replace function public._distribution_reason(p_team uuid, p_brief_id text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_brief   jsonb;
  s         jsonb;
  v_type    text;
  v_stages  jsonb;
  v_last    public.approvals;
  v_missing integer;
begin
  select data into v_brief from public.briefs where team_id = p_team and brief_id = p_brief_id order by created_at desc limit 1;
  if v_brief is null then return null; end if;

  select data->'approvals' into s from public.settings where team_id = p_team;
  if coalesce((s->>'enabled')::boolean, false) is not true
     or coalesce((s->>'blockDistributionWithoutApproval')::boolean, false) is not true then
    return null;
  end if;

  v_type := v_brief->'campaign'->>'emailType';
  select e.value->'stages' into v_stages
    from jsonb_array_elements(coalesce(s->'emailTypeConfigs', '[]'::jsonb)) as e(value)
   where e.value->>'emailType' = v_type and jsonb_array_length(coalesce(e.value->'stages', '[]'::jsonb)) > 0
   limit 1;
  v_stages := coalesce(v_stages, s->'defaultStages', '[]'::jsonb);
  if jsonb_array_length(v_stages) = 0 then return null; end if;

  select * into v_last from public.approvals where team_id = p_team and brief_id = p_brief_id order by round desc, stage desc limit 1;
  if v_last.id is null then return 'not_submitted'; end if;
  if v_last.status = 'pending' then return 'approval_pending'; end if;
  if v_last.status = 'changes_requested' then return 'changes_requested'; end if;
  if v_last.status = 'rejected' then return 'approval_rejected'; end if;
  if v_last.status in ('withdrawn', 'superseded') then return 'approval_withdrawn'; end if;

  -- The latest is an approval: every stage needs a current one, none out of date.
  select count(*) into v_missing
    from generate_series(1, v_last.total_stages) k
   where not exists (
     select 1 from public.approvals a
      where a.team_id = p_team and a.brief_id = p_brief_id and a.status = 'approved' and not a.stale and a.stage = k);
  if v_missing > 0 then return 'approval_stale'; end if;

  return null;
end;
$$;

-- For the screen, so it can say why before trying
create or replace function public.brief_distribution_check(p_brief_id text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_team uuid;
begin
  select team_id into v_team from public.profiles where id = auth.uid();
  if v_team is null then raise exception 'not_signed_in'; end if;
  return public._distribution_reason(v_team, p_brief_id);
end;
$$;

-- ─── The board refuses to move a brief to Distributed unless it is approved ────────────────────────────────────────
create or replace function public.kanban_distribution_gate()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
begin
  if new."column" = 'distributed' and old."column" is distinct from 'distributed' then
    if coalesce(current_setting('app.approval_override', true), '') = 'on' then return new; end if;
    v_reason := public._distribution_reason(new.team_id, new.brief_id);
    if v_reason is not null then raise exception 'distribution_blocked:%', v_reason; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists kanban_cards_distribution_gate on public.kanban_cards;
create trigger kanban_cards_distribution_gate
  before update of "column" on public.kanban_cards
  for each row execute function public.kanban_distribution_gate();

-- ─── distribute_with_override: an admin distributes it anyway, with a reason that is kept ──────────────────────────
create or replace function public.distribute_with_override(p_card_id uuid, p_reason text)
returns public.kanban_cards
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_team   uuid;
  v_name   text;
  v_role   text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_why    text;
  c        public.kanban_cards;
begin
  select team_id, display_name, role into v_team, v_name, v_role from public.profiles where id = v_uid;
  if v_team is null then raise exception 'not_signed_in'; end if;
  if v_role <> 'admin' then raise exception 'admin_only'; end if;
  if v_reason is null or length(v_reason) < 10 then raise exception 'override_reason_required'; end if;

  select * into c from public.kanban_cards where id = p_card_id and team_id = v_team for update;
  if not found then raise exception 'card_not_found'; end if;
  if c."column" = 'distributed' then raise exception 'already_distributed'; end if;

  v_why := public._distribution_reason(v_team, c.brief_id);
  if v_why is null then raise exception 'not_blocked'; end if;

  perform set_config('app.approval_override', 'on', true);
  update public.kanban_cards
     set "column" = 'distributed',
         column_history = coalesce(column_history, '[]'::jsonb)
           || jsonb_build_array(jsonb_build_object('column', 'distributed', 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'override', true))
   where id = c.id
   returning * into c;
  perform set_config('app.approval_override', 'off', true);

  insert into public.approval_overrides (team_id, brief_id, card_id, actor_id, actor_name, reason, blocked_for)
  values (v_team, c.brief_id, c.id, v_uid, v_name, v_reason, v_why);

  return c;
end;
$$;

-- ─── Who should be told: the people who could decide an approval ───────────────────────────────────────────────────
create or replace function public.approval_recipients(p_approval_id uuid)
returns table (user_id uuid, display_name text, email text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_team uuid;
  a      public.approvals;
begin
  select team_id into v_team from public.profiles where id = auth.uid();
  if v_team is null then raise exception 'not_signed_in'; end if;

  select * into a from public.approvals where id = p_approval_id and team_id = v_team;
  if not found then raise exception 'approval_not_found'; end if;

  return query
    select p.id, p.display_name, p.email
      from public.profiles p
     where p.team_id = v_team and p.id <> a.requested_by
       and ((a.approver_user_id is not null and p.id = a.approver_user_id)
         or (a.approver_user_id is null and p.id in (
               select m.user_id from public.approval_pool_members m where m.team_id = a.team_id and m.role = a.approver_role)));
end;
$$;

-- ─── Who may call what ─────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.request_approval(text, text, jsonb, integer)  from public, anon;
revoke all on function public.decide_approval(uuid, text, text)             from public, anon;
revoke all on function public.withdraw_approval(uuid, text)                 from public, anon;
revoke all on function public.brief_distribution_check(text)                from public, anon;
revoke all on function public.distribute_with_override(uuid, text)          from public, anon;
revoke all on function public.approval_recipients(uuid)                     from public, anon;
revoke all on function public.brief_content_hash(jsonb)                     from public, anon, authenticated;
revoke all on function public._distribution_reason(uuid, text)              from public, anon, authenticated;
revoke all on function public.supersede_approvals_on_brief_change()         from public, anon, authenticated;
revoke all on function public.kanban_distribution_gate()                    from public, anon, authenticated;

grant execute on function public.request_approval(text, text, jsonb, integer)  to authenticated;
grant execute on function public.decide_approval(uuid, text, text)             to authenticated;
grant execute on function public.withdraw_approval(uuid, text)                 to authenticated;
grant execute on function public.brief_distribution_check(text)                to authenticated;
grant execute on function public.distribute_with_override(uuid, text)          to authenticated;
grant execute on function public.approval_recipients(uuid)                     to authenticated;
