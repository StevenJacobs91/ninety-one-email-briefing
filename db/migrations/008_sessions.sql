-- Server-side sessions. The browser holds only an opaque id in a signed cookie;
-- revoking a row signs the user out immediately, which a stateless token cannot.

create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  team_id    uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  ip         inet
);
alter table public.sessions
  add column if not exists profile_id uuid,
  add column if not exists team_id    uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists user_agent text,
  add column if not exists ip         inet;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_profile_id_fkey') then
    alter table public.sessions add constraint sessions_profile_id_fkey
      foreign key (profile_id) references public.profiles (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sessions_team_id_fkey') then
    alter table public.sessions add constraint sessions_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
end $$;

create index if not exists sessions_team_profile_idx on public.sessions (team_id, profile_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at)
  where revoked_at is null;

grant select, insert, update, delete on public.sessions to app_user;
alter table public.sessions enable row level security;
alter table public.sessions force row level security;
drop policy if exists sessions_tenant on public.sessions;
create policy sessions_tenant on public.sessions to app_user
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
