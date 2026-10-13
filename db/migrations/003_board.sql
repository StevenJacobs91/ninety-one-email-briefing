-- Campaign board. kanban_cards."column" is a reserved word and must stay quoted.

create table if not exists public.kanban_columns (
  id            text not null,
  team_id       uuid not null,
  label         text not null,
  display_order integer not null,
  colour        text,
  wip_limit     integer,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (id, team_id)
);
alter table public.kanban_columns
  add column if not exists label         text,
  add column if not exists display_order integer,
  add column if not exists colour        text,
  add column if not exists wip_limit     integer,
  add column if not exists is_default    boolean not null default false,
  add column if not exists created_at    timestamptz not null default now();

create table if not exists public.kanban_cards (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid not null,
  brief_id              text not null,
  email_name            text not null default '',
  email_type            text not null default '',
  theme                 text not null default '',
  subject_line          text not null default '',
  region                text[] not null default '{}'::text[],
  channel               text[] not null default '{}'::text[],
  client_group          text[] not null default '{}'::text[],
  send_date             text,
  content_approval_date text,
  urgency               text not null default 'standard',
  "column"              text not null default 'briefed',
  submitted_at          timestamptz default now(),
  column_history        jsonb not null default '[]'::jsonb,
  notes                 text default '',
  tags                  text default '',
  assignee              text,
  start_date            date,
  progress              integer,
  comments              jsonb not null default '[]'::jsonb,
  created_at            timestamptz default now()
);
alter table public.kanban_cards
  add column if not exists brief_id              text,
  add column if not exists email_name            text not null default '',
  add column if not exists email_type            text not null default '',
  add column if not exists theme                 text not null default '',
  add column if not exists subject_line          text not null default '',
  add column if not exists region                text[] not null default '{}'::text[],
  add column if not exists channel               text[] not null default '{}'::text[],
  add column if not exists client_group          text[] not null default '{}'::text[],
  add column if not exists send_date             text,
  add column if not exists content_approval_date text,
  add column if not exists urgency               text not null default 'standard',
  add column if not exists "column"              text not null default 'briefed',
  add column if not exists submitted_at          timestamptz default now(),
  add column if not exists column_history        jsonb not null default '[]'::jsonb,
  add column if not exists notes                 text default '',
  add column if not exists tags                  text default '',
  add column if not exists assignee              text,
  add column if not exists start_date            date,
  add column if not exists progress              integer,
  add column if not exists comments              jsonb not null default '[]'::jsonb,
  add column if not exists created_at            timestamptz default now();

-- The client sends `undefined` for unset regions/channels, which the driver
-- maps to NULL, and a NULL parameter does not trigger a column DEFAULT. These
-- columns are NOT NULL so that case fails loudly instead of storing a NULL the
-- board UI will throw on. Backfill first so the constraint can be added to a
-- drifted table.
update public.kanban_cards set region = '{}'::text[] where region is null;
update public.kanban_cards set channel = '{}'::text[] where channel is null;
update public.kanban_cards set client_group = '{}'::text[] where client_group is null;
update public.kanban_cards set column_history = '[]'::jsonb where column_history is null;
alter table public.kanban_cards
  alter column region         set not null,
  alter column channel        set not null,
  alter column client_group   set not null,
  alter column column_history set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'kanban_columns_team_id_fkey') then
    alter table public.kanban_columns add constraint kanban_columns_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kanban_cards_team_id_fkey') then
    alter table public.kanban_cards add constraint kanban_cards_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kanban_cards_progress_check') then
    alter table public.kanban_cards add constraint kanban_cards_progress_check
      check (progress >= 0 and progress <= 100);
  end if;
  -- Column ids are text and renameable, hence ON UPDATE CASCADE. Cards restrict
  -- on delete while kanban_columns cascades from teams: deleting a team removes
  -- its board definition, but a team holding cards cannot be deleted at all.
  if not exists (select 1 from pg_constraint where conname = 'kanban_cards_column_fkey') then
    alter table public.kanban_cards add constraint kanban_cards_column_fkey
      foreign key (team_id, "column") references public.kanban_columns (team_id, id)
      on delete restrict on update cascade;
  end if;
end $$;

create index if not exists kanban_columns_team_id_idx on public.kanban_columns (team_id);
create unique index if not exists kanban_cards_team_brief_key on public.kanban_cards (team_id, brief_id);
create index if not exists kanban_cards_team_column_idx on public.kanban_cards (team_id, "column");
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
revoke execute on function public.seed_default_columns(uuid) from public;
