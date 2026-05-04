-- Join workspace by ID (couple share). Anyone with the workspace UUID can
-- self-join — UUIDs are not secrets but unguessable enough for friends-and-
-- family use.

create or replace function public.join_workspace(
  ws uuid,
  member_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  exists_ws boolean;
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;
  select exists(select 1 from public.workspaces where id = ws) into exists_ws;
  if not exists_ws then
    raise exception 'workspace_not_found';
  end if;

  insert into public.workspace_members (workspace_id, user_id, member_name, role)
  values (ws, caller, member_name, 'member')
  on conflict (workspace_id, user_id) do update
    set member_name = excluded.member_name;

  return ws;
end;
$$;

grant execute on function public.join_workspace(uuid, text) to authenticated;
