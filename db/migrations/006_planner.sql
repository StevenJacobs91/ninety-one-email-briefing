-- Carried over from Supabase for schema parity. No application code reads these yet.

create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete restrict,
  name        text not null,
  description text,
  status      text not null default 'planning'
              constraint campaigns_status_check
              check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  colour      text not null default '#134848',
  start_date  date,
  end_date    date,
  owner_id    uuid references public.profiles (id) on delete set null,
  created_by  uuid not null references public.profiles (id) on delete restrict,
  tags        text[] not null default '{}'::text[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create table if not exists public.campaign_briefs (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  campaign_id   uuid not null references public.campaigns (id) on delete cascade,
  brief_id      text not null,
  display_order integer not null default 0,
  added_by      uuid not null references public.profiles (id) on delete restrict,
  added_at      timestamptz not null default now()
);

create index if not exists campaign_briefs_campaign_idx
  on public.campaign_briefs (campaign_id, display_order);

create table if not exists public.planner_settings (
  team_id    uuid primary key references public.teams (id) on delete cascade,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
