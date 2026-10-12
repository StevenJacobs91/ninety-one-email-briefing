-- Foundation: extensions, tenancy, identity.
-- profiles.id holds the Microsoft Entra ID object id (oid). There is no auth schema.
--
-- Every table is created IF NOT EXISTS and then reconciled column-by-column, so
-- this converges an empty, partially-migrated or complete database alike.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public;

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);
alter table public.teams
  add column if not exists name       text,
  add column if not exists created_at timestamptz default now();

create table if not exists public.profiles (
  id                   uuid primary key,                  -- Entra ID object id (oid)
  team_id              uuid not null,
  display_name         text not null default '',
  email                text,
  role                 text not null default 'requester',
  preset_client_groups text[] not null default '{}'::text[],
  preset_regions       text[] not null default '{}'::text[],
  created_at           timestamptz default now()
);
alter table public.profiles
  add column if not exists team_id              uuid,
  add column if not exists display_name         text not null default '',
  add column if not exists email                text,
  add column if not exists role                 text not null default 'requester',
  add column if not exists preset_client_groups text[] not null default '{}'::text[],
  add column if not exists preset_regions       text[] not null default '{}'::text[],
  add column if not exists created_at           timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_team_id_fkey') then
    alter table public.profiles add constraint profiles_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check
      check (role in ('admin', 'producer', 'requester'));
  end if;
end $$;

create index if not exists profiles_team_id_idx on public.profiles (team_id);

-- security_invoker: without it the view runs as its owner and bypasses RLS on
-- profiles, handing every tenant's roster to any caller.
create or replace view public.team_members with (security_invoker = true) as
  select id, team_id, display_name, email, role,
         preset_client_groups, preset_regions, created_at
    from public.profiles;
