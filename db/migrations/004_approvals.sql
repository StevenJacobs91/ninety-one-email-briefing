create table if not exists public.approvals (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams (id) on delete restrict,
  brief_id          text not null,
  email_name        text not null,
  status            text not null default 'pending'
                    constraint approvals_status_check
                    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  requested_by      uuid not null references public.profiles (id) on delete restrict,
  requested_by_name text not null,
  requested_at      timestamptz not null default now(),
  decided_by        uuid references public.profiles (id) on delete set null,
  decided_by_name   text,
  decided_at        timestamptz,
  decision_comment  text,
  approver_role     text not null
                    constraint approvals_approver_role_check
                    check (approver_role in ('brand_guardian', 'legal', 'manager', 'reviewer')),
  approver_user_id  uuid references public.profiles (id) on delete set null,
  due_date          timestamptz,
  stage             integer not null default 1,
  total_stages      integer not null default 1,
  version_snapshot  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists approvals_team_brief_idx on public.approvals (team_id, brief_id);

create table if not exists public.approval_comments (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete restrict,
  approval_id  uuid not null references public.approvals (id) on delete cascade,
  brief_id     text not null,
  parent_id    uuid references public.approval_comments (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete restrict,
  author_name  text not null,
  author_role  text not null,
  body         text not null,
  comment_type text not null default 'suggestion'
               constraint approval_comments_comment_type_check
               check (comment_type in ('approval', 'change_request', 'suggestion', 'question', 'private_note')),
  category     text not null default 'general'
               constraint approval_comments_category_check
               check (category in ('brand', 'grammar', 'compliance', 'general')),
  is_resolved  boolean not null default false,
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists approval_comments_approval_idx
  on public.approval_comments (approval_id, created_at);

drop trigger if exists approvals_updated_at on public.approvals;
create trigger approvals_updated_at
  before update on public.approvals
  for each row execute function public.set_updated_at();

drop trigger if exists approval_comments_updated_at on public.approval_comments;
create trigger approval_comments_updated_at
  before update on public.approval_comments
  for each row execute function public.set_updated_at();
