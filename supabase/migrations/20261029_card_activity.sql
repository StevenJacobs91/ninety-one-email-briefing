-- Card history: a record of every change made on a board card (edits to its brief fields, assignee, production start,
-- progress, notes and comments), shown in the card's History beside its stage moves.
--   * One row per change, with who made it, when, and the value before and after.
--   * Append-only, like approval_events: rows are inserted by the people who make the change and never changed or removed,
--     so two people editing a card at once cannot overwrite each other's history.
--   * Stage moves stay in kanban_cards.column_history, which now also records who moved the card.
-- Apply this BEFORE deploying the app version that records and reads it. Adding it first changes nothing for the old app.

create table if not exists public.card_activity (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null,
  card_id    uuid not null references public.kanban_cards (id) on delete cascade,
  actor_id   uuid not null,
  actor_name text not null,
  field      text not null,
  label      text not null,
  from_value text,
  to_value   text,
  created_at timestamptz not null default now()
);

create index if not exists card_activity_card_id_idx on public.card_activity (card_id, created_at);

alter table public.card_activity enable row level security;

create policy "team members can read card activity"
  on public.card_activity for select
  using (team_id = public.get_my_team_id());

create policy "team members can record their own card activity"
  on public.card_activity for insert
  with check (team_id = public.get_my_team_id() and actor_id = auth.uid());

-- No update or delete policy, and the rights are taken away as well, so a change once recorded stays recorded.
revoke update, delete, truncate on public.card_activity from anon, authenticated;
