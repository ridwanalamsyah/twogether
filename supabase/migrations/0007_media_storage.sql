-- Photos, files and voice notes live in Storage instead of inside table rows
-- (a 300 KB base64 photo per row filled the 500 MB free database fast, and
-- every pull downloaded them all again). Rows keep a short "sb:<path>" link.
--
-- Path layout: <workspace_id>/<record id>[-suffix]. Only members of that
-- workspace can read or write it. Safe to run more than once.

insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "media_select" on storage.objects;
create policy "media_select" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "media_insert" on storage.objects;
create policy "media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "media_update" on storage.objects;
create policy "media_update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "media_delete" on storage.objects;
create policy "media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
