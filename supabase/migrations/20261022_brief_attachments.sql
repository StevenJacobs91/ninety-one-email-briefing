-- Files attached to a brief: kept in a private bucket, shown on the Campaign Board card, and handed to
-- Power Automate (as the files themselves and as time-limited download links).

-- The card lists the files attached to its brief: [{ name, size, type, path }].
alter table public.kanban_cards
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Private bucket, 10 MB per file. Files live under <team id>/<brief id>/, which is what the policies check.
insert into storage.buckets (id, name, public, file_size_limit)
values ('brief-attachments', 'brief-attachments', false, 10485760)
on conflict (id) do nothing;

-- Only members of a team can see, add or remove that team's files.
drop policy if exists "Team members read brief attachments" on storage.objects;
create policy "Team members read brief attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'brief-attachments' and (storage.foldername(name))[1] = public.get_my_team_id()::text);

drop policy if exists "Team members add brief attachments" on storage.objects;
create policy "Team members add brief attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'brief-attachments' and (storage.foldername(name))[1] = public.get_my_team_id()::text);

drop policy if exists "Team members remove brief attachments" on storage.objects;
create policy "Team members remove brief attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'brief-attachments' and (storage.foldername(name))[1] = public.get_my_team_id()::text);
