-- Campaign board. kanban_cards."column" is a reserved word and must stay quoted.

create table if not exists public.kanban_columns (
  id            text not null,
  team_id       uuid not null references public.teams (id) on delete cascade,
  label         text not null,
  display_order integer not null,
  colour        text,
  wip_limit     integer,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (id, team_id)
);

create table if not exists public.kanban_cards (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid not null references public.teams (id) on delete restrict,
  brief_id              text not null,
  email_name            text not null default '',
  email_type            text not null default '',
  theme                 text not null default '',
  subject_line          text not null default '',
  region                text[] default '{}'::text[],
  channel               text[] default '{}'::text[],
  client_group          text[] default '{}'::text[],
  send_date             text,
  content_approval_date text,
  urgency               text not null default 'standard',
  "column"              text not null default 'briefed',
  submitted_at          timestamptz default now(),
  column_history        jsonb default '[]'::jsonb,
  notes                 text default '',
  tags                  text default '',
  assignee              text,
  start_date            date,
  progress              integer
                        constraint kanban_cards_progress_check
                        check (progress >= 0 and progress <= 100),
  comments              jsonb not null default '[]'::jsonb,
  created_at            timestamptz default now(),
  constraint kanban_cards_column_fkey
    foreign key (team_id, "column")
    references public.kanban_columns (team_id, id)
);

create index if not exists kanban_cards_assignee_idx
  on public.kanban_cards (team_id, assignee) where assignee is not null;

create index if not exists kanban_cards_comments_gin_idx
  on public.kanban_cards using gin (comments);

-- Every team needs board columns before any card can be inserted.
create or replace function public.seed_default_columns(p_team_id uuid)
returns void language sql as $$
  insert into public.kanban_columns (id, team_id, label, display_order, is_default)
  values ('briefed',     p_team_id, 'Briefed',     0, true),
         ('in-progress', p_team_id, 'In Progress', 1, false),
         ('distributed', p_team_id, 'Distributed', 2, false)
  on conflict (id, team_id) do nothing;
$$;
