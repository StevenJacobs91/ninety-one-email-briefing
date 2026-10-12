-- Defence in depth. The API sets `app.team_id` per transaction with SET LOCAL.
-- Without it, current_team_id() returns NULL and every policy denies.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;

grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant select on public.team_members to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;

create or replace function public.current_team_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.team_id', true), '')::uuid;
$$;

revoke execute on function public.current_team_id() from public;
grant execute on function public.current_team_id() to app_user;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settings','briefs','drafts','audit_log',
    'kanban_columns','kanban_cards','approvals','approval_comments',
    'send_time_events','benchmark_entries','audience_health_snapshots',
    'campaigns','campaign_briefs','planner_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    execute format(
      'create policy %I on public.%I using (team_id = public.current_team_id())
         with check (team_id = public.current_team_id())',
      t || '_tenant', t);
  end loop;
end
$$;

-- teams has no team_id column; scope it by primary key instead.
alter table public.teams enable row level security;
alter table public.teams force row level security;
drop policy if exists teams_tenant on public.teams;
create policy teams_tenant on public.teams
  using (id = public.current_team_id())
  with check (id = public.current_team_id());
