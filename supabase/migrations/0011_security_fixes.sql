-- Security & correctness fixes found in the October 2026 review.
-- Safe to run more than once.

-- ============================================================
-- 1. Nobody can add themselves to someone else's workspace.
--    Before: wm_insert allowed `user_id = auth.uid()` for ANY workspace,
--    and wm_update had no check, so a member could move their row into
--    another workspace. Joining now only happens through the RPCs below
--    (security definer); a workspace owner can still add rows directly.
-- ============================================================
drop policy if exists "wm_insert" on public.workspace_members;
create policy "wm_insert" on public.workspace_members for insert
  with check (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

drop policy if exists "wm_update" on public.workspace_members;
create policy "wm_update" on public.workspace_members for update
  using (user_id = auth.uid() or exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
  ))
  with check (
    (user_id = auth.uid() and public.is_workspace_member(workspace_id))
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- ============================================================
-- 2. Joining by pasted code: a couple's space holds two people. A third
--    account (e.g. someone who saw the code in a screenshot) is refused.
-- ============================================================
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
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;
  if not exists (select 1 from public.workspaces where id = ws) then
    raise exception 'workspace_not_found';
  end if;
  if not exists (select 1 from public.workspace_members where workspace_id = ws and user_id = caller)
     and (select count(*) from public.workspace_members where workspace_id = ws) >= 2 then
    raise exception 'workspace_full';
  end if;

  insert into public.workspace_members (workspace_id, user_id, member_name, role)
  values (ws, caller, member_name, 'member')
  on conflict (workspace_id, user_id) do update
    set member_name = excluded.member_name;

  update public.push_subscriptions set workspace_id = ws where user_id = caller;
  return ws;
end;
$$;
grant execute on function public.join_workspace(uuid, text) to authenticated;

-- ============================================================
-- 3. Invite links: gen_random_bytes lives in the `extensions` schema on
--    Supabase, so creating a link failed with "function does not exist".
-- ============================================================
alter function public.create_workspace_invite(uuid, int) set search_path = public, extensions;

-- ============================================================
-- 4. Using an invite: lock the row (two people opening a leaked link at
--    once), don't let the inviter "use" their own link, refuse a full
--    space, and move this person's notification devices along.
-- ============================================================
create or replace function public.consume_workspace_invite(
  p_token text,
  p_member_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  inv record;
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;
  select * into inv from public.workspace_invites
  where token = p_token
  limit 1
  for update;
  if not found then
    raise exception 'invite_not_found';
  end if;
  if inv.created_by = caller then
    return inv.workspace_id; -- opening your own link: nothing to do
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;
  if inv.used_at is not null and inv.used_by is distinct from caller then
    raise exception 'invite_already_used';
  end if;
  if not exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = caller)
     and (select count(*) from public.workspace_members where workspace_id = inv.workspace_id) >= 2 then
    raise exception 'workspace_full';
  end if;

  insert into public.workspace_members (workspace_id, user_id, member_name, role)
  values (inv.workspace_id, caller, p_member_name, 'member')
  on conflict (workspace_id, user_id) do update
    set member_name = excluded.member_name;
  update public.workspace_invites
    set used_at = coalesce(used_at, now()),
        used_by = coalesce(used_by, caller)
    where id = inv.id;
  update public.profiles
    set active_workspace_id = inv.workspace_id,
        updated_at = now()
    where id = caller;
  update public.push_subscriptions set workspace_id = inv.workspace_id where user_id = caller;
  return inv.workspace_id;
end;
$$;
grant execute on function public.consume_workspace_invite(text, text) to authenticated;

-- ============================================================
-- 5. Leaving: the app now says which workspace (the profile's active one
--    could be empty, which used to skip removing the membership), the
--    owner hands ownership to the partner who stays, and notification
--    devices stop receiving the old space's pings.
-- ============================================================
drop function if exists public.leave_workspace();
create or replace function public.leave_workspace(p_workspace_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  current_ws uuid;
  caller_name text;
  new_ws uuid;
  heir uuid;
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;
  select coalesce(p_workspace_id, active_workspace_id), name
    into current_ws, caller_name
    from public.profiles
    where id = caller;

  if current_ws is not null then
    delete from public.workspace_members
      where user_id = caller and workspace_id = current_ws;
    select user_id into heir from public.workspace_members
      where workspace_id = current_ws
      order by user_id
      limit 1;
    if heir is not null then
      update public.workspaces set owner_id = heir
        where id = current_ws and owner_id = caller;
      update public.workspace_members set role = 'owner'
        where workspace_id = current_ws and user_id = heir;
    end if;
  end if;

  insert into public.workspaces (name, owner_id, shared_label)
  values ('Workspace ' || coalesce(caller_name, 'Saya'), caller, 'Berdua')
  returning id into new_ws;
  insert into public.workspace_members (workspace_id, user_id, member_name, role)
  values (new_ws, caller, coalesce(caller_name, 'Saya'), 'owner');
  update public.profiles
    set active_workspace_id = new_ws, updated_at = now()
    where id = caller;
  update public.push_subscriptions set workspace_id = new_ws where user_id = caller;
  return new_ws;
end;
$$;
grant execute on function public.leave_workspace(uuid) to authenticated;

-- ============================================================
-- 6. An older offline edit must not overwrite a newer one on the server
--    (the phones would then disagree forever). Last write wins by the
--    record's own updated_at, same rule the app uses locally.
-- ============================================================
create or replace function public.keep_newer_row() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at then
    return null; -- skip this stale update
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'transactions','goals','deposits','checklists','moments','dashboards','preferences',
    'skripsi_chapters','skripsi_bimbingan','skripsi_meta','deadlines','konten','habits','habit_logs',
    'reflections','recurring','budgets','trips','recurring_goals','entries','items'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists keep_newer on public.%I', t);
      execute format('create trigger keep_newer before update on public.%I for each row execute function public.keep_newer_row()', t);
    end if;
  end loop;
end $$;
