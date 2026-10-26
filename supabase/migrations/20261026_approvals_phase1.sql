-- ─── Approvals, phase 1: who may decide, safe stage changes, an audit log ───────────────────────────────────────────
-- Before this, any team member could insert or update any approval row, so anyone could decide anything, and moving to
-- the next stage was two separate client calls. After it:
--   * who may decide each stage comes from approval_pool_members (changed only by admins) or a named approver;
--   * submitting and deciding go through functions that check that, block approving your own submission, and move to
--     the next stage in the same transaction, from the stages saved when the brief was submitted;
--   * every action is written to an append-only approval_events table.
-- Apply this BEFORE deploying the app version that calls these functions.

-- ─── approvals: the stages this approval follows, saved at submission ──────────────────────────────────────────────
alter table public.approvals
  add column if not exists stages_snapshot jsonb not null default '[]'::jsonb;

-- Approvals already in flight with more than one stage were following the team's default stages.
update public.approvals a
   set stages_snapshot = coalesce(
         (select s.data->'approvals'->'defaultStages' from public.settings s where s.team_id = a.team_id),
         '[]'::jsonb)
 where a.stages_snapshot = '[]'::jsonb
   and a.total_stages > 1;

-- ─── approval_pool_members: who may decide each role's stages ──────────────────────────────────────────────────────
create table if not exists public.approval_pool_members (
  team_id    uuid not null,
  role       text not null check (role in ('brand_guardian','legal','manager','reviewer')),
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (team_id, role, user_id)
);

alter table public.approval_pool_members enable row level security;

create policy "team members can read approval pools"
  on public.approval_pool_members for select
  using (team_id = public.get_my_team_id());
-- No insert, update or delete policy: pools change only through set_approval_pool, which only admins can use.

-- ─── approval_events: an append-only record of what happened ───────────────────────────────────────────────────────
create table if not exists public.approval_events (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null,
  approval_id  uuid not null references public.approvals (id) on delete restrict,
  brief_id     text not null,
  actor_id     uuid not null,
  actor_name   text not null,
  actor_role   text not null,
  action       text not null check (action in ('requested','approved','rejected','changes_requested','stage_started')),
  stage        integer not null,
  total_stages integer not null,
  comment      text,
  created_at   timestamptz not null default now()
);

create index if not exists approval_events_approval_id_idx on public.approval_events (approval_id);
create index if not exists approval_events_brief_id_idx    on public.approval_events (brief_id);

alter table public.approval_events enable row level security;

create policy "team members can read approval events"
  on public.approval_events for select
  using (team_id = public.get_my_team_id());
-- No insert, update or delete policy: events are written only by the functions below, and never changed.
revoke update, delete, truncate on public.approval_events from anon, authenticated;

-- ─── approvals: no more direct writes from the browser ─────────────────────────────────────────────────────────────
drop policy if exists "team members can insert approvals" on public.approvals;
drop policy if exists "team members can update approvals" on public.approvals;
-- Reading stays as it was. Submitting and deciding now go through request_approval and decide_approval.

-- ─── Helper: how many people could decide a stage, not counting the person submitting ──────────────────────────────
create or replace function public.approval_stage_eligible(p_team uuid, p_role text, p_user uuid, p_requester uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select case
    when p_user is not null then (case when p_user <> p_requester then 1 else 0 end)
    else (select count(*)::integer
            from public.approval_pool_members m
           where m.team_id = p_team and m.role = p_role and m.user_id <> p_requester)
  end
$$;

-- ─── set_approval_pool: admins choose who is in a role's pool ──────────────────────────────────────────────────────
create or replace function public.set_approval_pool(p_role text, p_user_ids uuid[])
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_role text;
begin
  select team_id, role into v_team, v_role from public.profiles where id = auth.uid();
  if v_team is null then raise exception 'not_signed_in'; end if;
  if v_role <> 'admin' then raise exception 'admin_only'; end if;
  if p_role not in ('brand_guardian','legal','manager','reviewer') then raise exception 'invalid_role'; end if;

  delete from public.approval_pool_members where team_id = v_team and role = p_role;
  -- Only people on this team can be added.
  insert into public.approval_pool_members (team_id, role, user_id)
    select v_team, p_role, p.id
      from public.profiles p
     where p.team_id = v_team and p.id = any(coalesce(p_user_ids, '{}'::uuid[]));
end;
$$;

-- ─── request_approval: submit a brief for approval ─────────────────────────────────────────────────────────────────
create or replace function public.request_approval(
  p_brief_id text, p_email_name text, p_brief_snapshot jsonb, p_stages jsonb
)
returns public.approvals
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_team  uuid;
  v_name  text;
  v_role  text;
  v_stage jsonb;
  v_first jsonb;
  v_days  integer;
  v_row   public.approvals;
begin
  select team_id, display_name, role into v_team, v_name, v_role from public.profiles where id = v_uid;
  if v_team is null then raise exception 'not_signed_in'; end if;

  if jsonb_typeof(p_stages) is distinct from 'array' or jsonb_array_length(p_stages) = 0 then
    raise exception 'stages_required';
  end if;

  -- One open approval per brief at a time.
  if exists (select 1 from public.approvals where team_id = v_team and brief_id = p_brief_id and status = 'pending') then
    raise exception 'approval_already_open';
  end if;

  -- Every stage needs someone who could decide it, other than the person submitting.
  for v_stage in select value from jsonb_array_elements(p_stages) loop
    if public.approval_stage_eligible(v_team, v_stage->>'role', nullif(v_stage->>'assignedUserId', '')::uuid, v_uid) = 0 then
      raise exception 'no_approver:%', v_stage->>'role';
    end if;
  end loop;

  v_first := p_stages->0;
  v_days  := nullif(v_first->>'dueDaysFromRequest', '')::integer;

  insert into public.approvals (
    team_id, brief_id, email_name, status, requested_by, requested_by_name,
    approver_role, approver_user_id, due_date, stage, total_stages, stages_snapshot, version_snapshot
  ) values (
    v_team, p_brief_id, p_email_name, 'pending', v_uid, v_name,
    v_first->>'role', nullif(v_first->>'assignedUserId', '')::uuid,
    case when v_days is not null then now() + make_interval(days => v_days) end,
    1, jsonb_array_length(p_stages), p_stages, coalesce(p_brief_snapshot, '{}'::jsonb)
  ) returning * into v_row;

  insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages)
  values (v_team, v_row.id, p_brief_id, v_uid, v_name, v_role, 'requested', 1, v_row.total_stages);

  return v_row;
end;
$$;

-- ─── decide_approval: approve, reject or ask for changes ───────────────────────────────────────────────────────────
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

  -- Locked, so two people deciding at once cannot both succeed.
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

  insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages, comment)
  values (a.team_id, a.id, a.brief_id, v_uid, v_name, v_role, p_decision, a.stage, a.total_stages, v_comment);

  -- Approved, with stages still to go: start the next one, from the stages saved at submission, in this same transaction.
  if p_decision = 'approved' and a.stage < a.total_stages then
    select e.value into v_next
      from jsonb_array_elements(a.stages_snapshot) as e(value)
     where (e.value->>'stage')::integer = a.stage + 1
     limit 1;
    if v_next is null then raise exception 'stage_missing'; end if;

    v_days := nullif(v_next->>'dueDaysFromRequest', '')::integer;

    insert into public.approvals (
      team_id, brief_id, email_name, status, requested_by, requested_by_name,
      approver_role, approver_user_id, due_date, stage, total_stages, stages_snapshot, version_snapshot
    ) values (
      a.team_id, a.brief_id, a.email_name, 'pending', a.requested_by, a.requested_by_name,
      v_next->>'role', nullif(v_next->>'assignedUserId', '')::uuid,
      case when v_days is not null then now() + make_interval(days => v_days) end,
      a.stage + 1, a.total_stages, a.stages_snapshot, a.version_snapshot
    );

    insert into public.approval_events (team_id, approval_id, brief_id, actor_id, actor_name, actor_role, action, stage, total_stages)
    select a.team_id, n.id, a.brief_id, v_uid, v_name, v_role, 'stage_started', n.stage, n.total_stages
      from public.approvals n
     where n.brief_id = a.brief_id and n.team_id = a.team_id and n.stage = a.stage + 1 and n.status = 'pending'
     order by n.created_at desc
     limit 1;
  end if;

  return a;
end;
$$;

-- ─── Who may call what ─────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.approval_stage_eligible(uuid, text, uuid, uuid) from public;
revoke all on function public.set_approval_pool(text, uuid[])                  from public;
revoke all on function public.request_approval(text, text, jsonb, jsonb)       from public;
revoke all on function public.decide_approval(uuid, text, text)                from public;

grant execute on function public.set_approval_pool(text, uuid[])                  to authenticated;
grant execute on function public.request_approval(text, text, jsonb, jsonb)       to authenticated;
grant execute on function public.decide_approval(uuid, text, text)                to authenticated;

-- ─── Lockdown (applied as a second step, approvals_phase1_lockdown) ────────────────────────────────────────────────
-- Supabase grants execute to its anon role directly, so "revoke ... from public" above does not stop signed-out callers.
revoke all on function public.approval_stage_eligible(uuid, text, uuid, uuid) from anon, authenticated;
revoke all on function public.set_approval_pool(text, uuid[])                  from anon;
revoke all on function public.request_approval(text, text, jsonb, jsonb)       from anon;
revoke all on function public.decide_approval(uuid, text, text)                from anon;

-- The browser reads these tables; it never writes them directly. Writes go through the functions above.
revoke insert, update, delete, truncate on public.approvals              from anon, authenticated;
revoke insert, update, delete, truncate on public.approval_events        from anon, authenticated;
revoke insert, update, delete, truncate on public.approval_pool_members  from anon, authenticated;
