create table if not exists public.send_time_events (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  brief_id      text not null,
  campaign_name text not null,
  email_type    text not null,
  sent_at       timestamptz not null,
  day_of_week   smallint not null
                constraint send_time_events_day_of_week_check
                check (day_of_week >= 0 and day_of_week <= 6),
  hour_of_day   smallint not null
                constraint send_time_events_hour_of_day_check
                check (hour_of_day >= 0 and hour_of_day <= 23),
  delivered     integer not null default 0,
  unique_clicks integer not null default 0,
  unique_ctr    numeric not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists send_time_events_team_sent_idx
  on public.send_time_events (team_id, sent_at desc);

create table if not exists public.benchmark_entries (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams (id) on delete restrict,
  label             text not null,
  email_category    text not null,
  period_label      text,
  avg_open_rate     numeric,
  avg_unique_ctr    numeric,
  avg_click_to_open numeric,
  avg_list_growth   numeric,
  notes             text,
  source            text not null default 'manual'
                    constraint benchmark_entries_source_check
                    check (source in ('manual', 'import', 'litmus', 'mailchimp', 'other')),
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists benchmark_entries_updated_at on public.benchmark_entries;
create trigger benchmark_entries_updated_at
  before update on public.benchmark_entries
  for each row execute function public.set_updated_at();

create index if not exists benchmark_entries_team_idx on public.benchmark_entries (team_id);

create table if not exists public.audience_health_snapshots (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  snapshot_date date not null,
  segment_type  text not null
                constraint audience_health_snapshots_segment_type_check
                check (segment_type in ('region', 'channel', 'client_group', 'email_type')),
  segment_value text not null,
  delivered     integer not null default 0,
  unique_clicks integer not null default 0,
  unique_ctr    numeric not null default 0,
  list_size     integer not null default 0,
  churn_score   numeric,
  risk_level    text
                constraint audience_health_snapshots_risk_level_check
                check (risk_level in ('low', 'medium', 'high', 'critical')),
  created_at    timestamptz not null default now()
);

create index if not exists audience_health_snapshots_team_date_idx
  on public.audience_health_snapshots (team_id, snapshot_date desc);
