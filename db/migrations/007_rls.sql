-- Tenant isolation, defence in depth.
--
-- WHAT THIS IS NOT: Supabase enforced isolation against a signed JWT the client
-- could not forge. app.team_id is an ordinary session variable that any
-- statement on the connection can rewrite, so this does NOT contain a
-- compromised or SQL-injectable API process. It contains the API's own missing
-- `where team_id = $1` clauses. See spec §5.
--
-- CONTRACT: the API sets app.team_id with set_config($1, $2, true) — the `true`
-- means transaction-local — inside an explicit BEGIN/COMMIT, and resets it on
-- pool release. A plain SET survives COMMIT and would serve the next request on
-- that pooled connection under the previous tenant's id. SET LOCAL issued
-- outside a transaction is discarded, current_team_id() returns NULL, and every
-- policy denies: endpoints return empty rather than leaking.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;

grant usage on schema public to app_user;

create or replace function public.current_team_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.team_id', true), '')::uuid;
$$;

revoke execute on function public.current_team_id() from public;
grant execute on function public.current_team_id() to app_user;
grant execute on function public.seed_default_columns(uuid) to app_user;

-- Grants are enumerated, not `on all tables`: a blanket grant sweeps in
-- schema_migrations (which is deliberately exempt from RLS, so app_user could
-- rewrite the migration ledger), and ALTER DEFAULT PRIVILEGES would make every
-- future table writable before anyone remembered to attach a policy.
do $$
declare t text;
begin
  foreach t in array array[
    'teams','profiles','settings','briefs','drafts','audit_log',
    'kanban_columns','kanban_cards','approvals','approval_comments',
    'send_time_events','benchmark_entries','audience_health_snapshots',
    'campaigns','campaign_briefs','planner_settings'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to app_user', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    if t = 'teams' then
      -- teams is NOT forced: the owning role on Azure is not a superuser, and
      -- FORCE here would make it impossible to create the first team or to read
      -- anything during an incident. The policy still scopes app_user.
      execute 'create policy teams_tenant on public.teams to app_user
                 using (id = public.current_team_id())
                 with check (id = public.current_team_id())';
    else
      execute format('alter table public.%I force row level security', t);
      execute format(
        'create policy %I on public.%I to app_user
           using (team_id = public.current_team_id())
           with check (team_id = public.current_team_id())',
        t || '_tenant', t);
    end if;
  end loop;
end
$$;

-- The view is security_invoker (001), so RLS on profiles still applies to it.
grant select on public.team_members to app_user;

revoke all on public.schema_migrations from app_user;
