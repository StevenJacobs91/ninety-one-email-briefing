-- Foundation: extensions, tenancy, identity.
-- profiles.id holds the Microsoft Entra ID object id (oid). There is no auth schema.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id                   uuid primary key,                  -- Entra ID object id (oid)
  team_id              uuid not null references public.teams (id) on delete restrict,
  display_name         text not null default '',
  email                text,
  role                 text not null default 'requester'
                       constraint profiles_role_check
                       check (role in ('admin', 'producer', 'requester')),
  preset_client_groups text[] not null default '{}'::text[],
  preset_regions       text[] not null default '{}'::text[],
  created_at           timestamptz default now()
);

create index if not exists profiles_team_id_idx on public.profiles (team_id);

-- Rebuilt from profiles alone; the Supabase version joined auth.users for email.
create or replace view public.team_members as
  select id, team_id, display_name, email, role,
         preset_client_groups, preset_regions, created_at
    from public.profiles;
