-- Core records. All user references point at profiles(id) (Entra oid).

create table if not exists public.settings (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null,
  data       jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz default now()
);
alter table public.settings
  add column if not exists team_id    uuid,
  add column if not exists data       jsonb not null default '{}'::jsonb,
  add column if not exists version    integer not null default 1,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.briefs (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null,
  brief_id      text not null,
  created_by    uuid,
  campaign_name text not null default '',
  email_type    text not null default '',
  theme         text not null default '',
  status        text not null default 'draft',
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.briefs
  add column if not exists team_id       uuid,
  add column if not exists brief_id      text,
  add column if not exists created_by    uuid,
  add column if not exists campaign_name text not null default '',
  add column if not exists email_type    text not null default '',
  add column if not exists theme         text not null default '',
  add column if not exists status        text not null default 'draft',
  add column if not exists data          jsonb not null default '{}'::jsonb,
  add column if not exists created_at    timestamptz default now(),
  add column if not exists updated_at    timestamptz default now();

create table if not exists public.drafts (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null,
  user_id       uuid not null,
  name          text not null default '',
  campaign_name text not null default '',
  email_type    text not null default '',
  data          jsonb not null default '{}'::jsonb,
  saved_at      timestamptz default now()
);
alter table public.drafts
  add column if not exists team_id       uuid,
  add column if not exists user_id       uuid,
  add column if not exists name          text not null default '',
  add column if not exists campaign_name text not null default '',
  add column if not exists email_type    text not null default '',
  add column if not exists data          jsonb not null default '{}'::jsonb,
  add column if not exists saved_at      timestamptz default now();

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null,
  user_id     uuid not null,
  user_email  text not null default '',
  user_name   text not null default '',
  action      text not null,
  category    text not null default 'general',
  entity_type text,
  entity_id   text,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);
alter table public.audit_log
  add column if not exists team_id     uuid,
  add column if not exists user_id     uuid,
  add column if not exists user_email  text not null default '',
  add column if not exists user_name   text not null default '',
  add column if not exists action      text,
  add column if not exists category    text not null default 'general',
  add column if not exists entity_type text,
  add column if not exists entity_id   text,
  add column if not exists details     jsonb default '{}'::jsonb,
  add column if not exists created_at  timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'settings_team_id_fkey') then
    alter table public.settings add constraint settings_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'settings_team_id_key') then
    alter table public.settings add constraint settings_team_id_key unique (team_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'briefs_team_id_fkey') then
    alter table public.briefs add constraint briefs_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'briefs_created_by_fkey') then
    alter table public.briefs add constraint briefs_created_by_fkey
      foreign key (created_by) references public.profiles (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'briefs_status_check') then
    alter table public.briefs add constraint briefs_status_check
      check (status in ('draft', 'submitted'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'drafts_team_id_fkey') then
    alter table public.drafts add constraint drafts_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'drafts_user_id_fkey') then
    alter table public.drafts add constraint drafts_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_log_team_id_fkey') then
    alter table public.audit_log add constraint audit_log_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_log_user_id_fkey') then
    alter table public.audit_log add constraint audit_log_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- brief_id is BriefMeta.briefId, a UUID minted once per brief: a natural key.
-- Without uniqueness a retried submit silently creates a second row and
-- "where brief_id = $1" becomes non-deterministic.
create unique index if not exists briefs_team_brief_key on public.briefs (team_id, brief_id);

-- Mirrors the Supabase migration "add_drafts_unique_constraint".
create unique index if not exists drafts_team_user_name_key
  on public.drafts (team_id, user_id, name);

create index if not exists audit_log_team_created_idx
  on public.audit_log (team_id, created_at desc);

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

drop trigger if exists briefs_updated_at on public.briefs;
create trigger briefs_updated_at before update on public.briefs
  for each row execute function public.set_updated_at();
