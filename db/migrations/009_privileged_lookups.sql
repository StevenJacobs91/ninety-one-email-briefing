-- The API never leaves the app_user role. The lookups that must happen before a
-- tenant is known — resolving a session cookie, and provisioning a profile on
-- first sign-in — are SECURITY DEFINER functions with a pinned search_path, so
-- the privileged surface is a few fixed statements rather than an arbitrary-SQL
-- escape hatch.
--
-- profiles and sessions drop FORCE (as 007 already does for teams): with FORCE
-- the definer is subject to its own policies, which are scoped TO app_user, so
-- a non-superuser owner on Azure would match no policy and every sign-in would
-- fail. ENABLE still constrains app_user, which is the role the API runs as.
--
-- Called by: db/migrate.mjs and api/test/helpers/db.mjs (which apply every .sql
-- in this directory in sorted order). The functions are invoked at runtime from
-- api/src/auth/sessions.mjs and api/src/auth/profiles.mjs.

alter table public.profiles no force row level security;
alter table public.sessions  no force row level security;

create or replace function public.lookup_session(p_session_id uuid)
returns table (
  id uuid, profile_id uuid, team_id uuid,
  role text, display_name text, email text
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select s.id, s.profile_id, s.team_id, p.role, p.display_name, p.email
    from public.sessions s
    join public.profiles p on p.id = s.profile_id
   where s.id = p_session_id
     and s.revoked_at is null
     and s.expires_at > now();
$$;

create or replace function public.upsert_profile(
  p_oid uuid, p_team_id uuid, p_display_name text, p_email text)
returns table (id uuid, team_id uuid, role text, display_name text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.profiles (id, team_id, display_name, email)
       values (p_oid, p_team_id, coalesce(p_display_name, ''), p_email)
  on conflict (id) do update
         set display_name = excluded.display_name,
             email        = excluded.email
    returning public.profiles.id, public.profiles.team_id,
              public.profiles.role, public.profiles.display_name;
$$;

create or replace function public.revoke_session(p_session_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.sessions set revoked_at = now()
   where id = p_session_id and revoked_at is null;
$$;

-- Single-use sign-in state. The authorization code travels in a URL; without a
-- server-side record the same code and cookie can be replayed to mint extra
-- sessions. Delete-on-use makes the second attempt find nothing.
-- state_hash is a SHA-256 hex digest of a random per-sign-in token.
create table if not exists public.auth_requests (
  state_hash text primary key,
  created_at timestamptz not null default now()
);
alter table public.auth_requests
  add column if not exists created_at timestamptz not null default now();
create index if not exists auth_requests_created_idx on public.auth_requests (created_at);

-- RLS on with no policy at all: app_user can never touch this table directly,
-- only through the SECURITY DEFINER functions below. No FORCE, so the definer
-- (the owner) is unconstrained.
alter table public.auth_requests enable row level security;

create or replace function public.open_auth_request(p_state_hash text)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.auth_requests (state_hash) values (p_state_hash)
  on conflict (state_hash) do nothing;
$$;

create or replace function public.claim_auth_request(p_state_hash text)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
as $$
  with expired as (
    delete from public.auth_requests
     where created_at < now() - interval '1 hour' returning 1
  ), claimed as (
    delete from public.auth_requests where state_hash = p_state_hash returning 1
  )
  select exists (select 1 from claimed);
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'lookup_session(uuid)', 'upsert_profile(uuid,uuid,text,text)',
    'revoke_session(uuid)', 'claim_auth_request(text)', 'open_auth_request(text)'
  ] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to app_user', f);
  end loop;
end
$$;
