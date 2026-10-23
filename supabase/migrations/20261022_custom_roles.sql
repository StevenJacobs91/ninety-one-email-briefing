-- A team can add its own roles (Settings → Users). The database still enforces access by the three base
-- roles in profiles.role; a custom role is an id into the team's settings that adds a name, colour and
-- landing page. Nullable, so nobody is affected until they are given one; a role deleted from settings
-- simply stops matching and the person keeps working as their base role.

alter table public.profiles
  add column if not exists custom_role_id text;

create or replace view public.team_members with (security_invoker = true) as
  select id, email, display_name, role, team_id, created_at, preset_client_groups, preset_regions, custom_role_id
  from public.profiles;
