-- Core records. All user references point at profiles(id) (Entra oid).

create table if not exists public.settings (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null unique references public.teams (id) on delete restrict,
  data       jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz default now()
);

create table if not exists public.briefs (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  brief_id      text not null,
  created_by    uuid references public.profiles (id) on delete set null,
  campaign_name text not null default '',
  email_type    text not null default '',
  theme         text not null default '',
  status        text not null default 'draft'
                constraint briefs_status_check check (status in ('draft', 'submitted')),
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists briefs_team_brief_idx on public.briefs (team_id, brief_id);

create table if not exists public.drafts (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null default '',
  campaign_name text not null default '',
  email_type    text not null default '',
  data          jsonb not null default '{}'::jsonb,
  saved_at      timestamptz default now()
);

-- Mirrors the Supabase migration "add_drafts_unique_constraint".
create unique index if not exists drafts_team_user_name_key
  on public.drafts (team_id, user_id, name);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete restrict,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  user_email  text not null default '',
  user_name   text not null default '',
  action      text not null,
  category    text not null default 'general',
  entity_type text,
  entity_id   text,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create index if not exists audit_log_team_created_idx
  on public.audit_log (team_id, created_at desc);
