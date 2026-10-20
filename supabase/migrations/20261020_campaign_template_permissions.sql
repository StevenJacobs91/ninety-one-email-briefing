-- Campaign templates live on the campaign's content preset inside the settings
-- JSONB blob (settings.data -> campaigns[] -> contentPreset -> build).
-- Row-level security cannot protect one key inside a blob, so a trigger rejects
-- any write that changes a campaign's saved build unless the caller's
-- profiles.role is admin or producer (same lookup as 20260407_approvals.sql).
-- Everything else in the blob stays writable exactly as before.
--
-- Targets the Supabase deployment (auth.uid()). The Azure/app_user deployment
-- has no auth.uid(); it needs an equivalent check keyed on its own session role.

create or replace function public.guard_campaign_builds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_builds jsonb;
  new_builds jsonb;
  caller_role text;
begin
  select coalesce(jsonb_agg(jsonb_build_array(c->>'id', c #> '{contentPreset,build}') order by c->>'id'), '[]'::jsonb)
    into new_builds
    from jsonb_array_elements(coalesce(new.data->'campaigns', '[]'::jsonb)) c;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(jsonb_build_array(c->>'id', c #> '{contentPreset,build}') order by c->>'id'), '[]'::jsonb)
      into old_builds
      from jsonb_array_elements(coalesce(old.data->'campaigns', '[]'::jsonb)) c;
  else
    old_builds := '[]'::jsonb;
  end if;

  if new_builds is distinct from old_builds then
    select role into caller_role from public.profiles where id = auth.uid();
    if caller_role is null or caller_role not in ('admin', 'producer') then
      raise exception 'Only a producer or admin can change a campaign template'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists settings_guard_campaign_builds on public.settings;
create trigger settings_guard_campaign_builds
  before insert or update on public.settings
  for each row execute function public.guard_campaign_builds();
