-- Who submitted each brief, shown on the Campaign Board card.
--
-- Nullable, so existing rows are unaffected. Visibility is unchanged: every member of the team
-- (producers included) already reads all of the team's cards through "Team members read kanban".

alter table public.kanban_cards
  add column if not exists submitted_by_name  text,
  add column if not exists submitted_by_email text;

-- Backfill cards created by Submit Brief & Template, which recorded "Created by: Name (email)" in the notes.
update public.kanban_cards
set submitted_by_name  = nullif(trim(substring(notes from 'Created by: ([^\n(]+)')), ''),
    submitted_by_email = substring(notes from 'Created by: [^\n]*\(([^)\n]+)\)')
where submitted_by_name is null
  and notes like 'Created by:%';
