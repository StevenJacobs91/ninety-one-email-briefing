-- ─── Shared trigger function (idempotent) ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── approvals ────────────────────────────────────────────────────────────────
create table if not exists public.approvals (
  id                  uuid primary key default gen_random_uuid(),
  team_id             uuid not null,
  brief_id            text not null,
  email_name          text not null,

  status              text not null default 'pending'
                      check (status in ('pending','approved','rejected','changes_requested')),

  -- Who submitted the approval request
  requested_by        uuid not null,
  requested_by_name   text not null,
  requested_at        timestamptz not null default now(),

  -- Who made the decision (null while pending)
  decided_by          uuid,
  decided_by_name     text,
  decided_at          timestamptz,
  decision_comment    text,

  -- Routing
  approver_role       text not null
                      check (approver_role in ('brand_guardian','legal','manager','reviewer')),
  approver_user_id    uuid,     -- null = any user with matching role may decide
  due_date            timestamptz,

  -- Sequential stage tracking (e.g. stage 1 of 3)
  stage               integer not null default 1,
  total_stages        integer not null default 1,

  -- Full brief payload snapshotted at submission time
  version_snapshot    jsonb not null default '{}',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger approvals_updated_at
  before update on public.approvals
  for each row execute function public.set_updated_at();

create index if not exists approvals_team_id_idx   on public.approvals (team_id);
create index if not exists approvals_brief_id_idx  on public.approvals (brief_id);
create index if not exists approvals_status_idx    on public.approvals (status);

alter table public.approvals enable row level security;

-- RLS: any authenticated user on the same team can read/insert/update approvals
create policy "team members can read approvals"
  on public.approvals for select
  using (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
  );

create policy "team members can insert approvals"
  on public.approvals for insert
  with check (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
  );

create policy "team members can update approvals"
  on public.approvals for update
  using (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
  );


-- ─── approval_comments ────────────────────────────────────────────────────────
create table if not exists public.approval_comments (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null,
  approval_id   uuid not null references public.approvals (id) on delete cascade,
  brief_id      text not null,

  -- Threading: null = top-level, non-null = reply
  parent_id     uuid references public.approval_comments (id) on delete cascade,

  author_id     uuid not null,
  author_name   text not null,
  author_role   text not null,

  body          text not null,

  comment_type  text not null default 'suggestion'
                check (comment_type in
                  ('approval','change_request','suggestion','question','private_note')),

  category      text not null default 'general'
                check (category in ('brand','grammar','compliance','general')),

  is_resolved   boolean not null default false,
  resolved_by   uuid,
  resolved_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger approval_comments_updated_at
  before update on public.approval_comments
  for each row execute function public.set_updated_at();

create index if not exists approval_comments_approval_id_idx on public.approval_comments (approval_id);
create index if not exists approval_comments_brief_id_idx    on public.approval_comments (brief_id);
create index if not exists approval_comments_parent_id_idx   on public.approval_comments (parent_id);

alter table public.approval_comments enable row level security;

create policy "team members can read comments"
  on public.approval_comments for select
  using (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
  );

create policy "team members can insert comments"
  on public.approval_comments for insert
  with check (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
  );

create policy "authors and admins can update comments"
  on public.approval_comments for update
  using (
    author_id = auth.uid()
    or team_id in (
      select team_id from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "authors and admins can delete comments"
  on public.approval_comments for delete
  using (
    author_id = auth.uid()
    or team_id in (
      select team_id from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );
