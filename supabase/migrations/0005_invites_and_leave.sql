-- Workspace invite tokens + leave-workspace flow.
--
-- BEFORE: gabung workspace = paste UUID. Tinggi friction, gampang salah copy,
-- dan UUID-nya juga muncul di URL kalau di-share via screenshot. Sekarang
-- generate short URL-safe token yang bisa dishare via link.
--
-- Also: once joined, user gak punya cara keluar dari workspace tanpa bantuan
-- admin. `leave_workspace()` ngehapus membership + bikin workspace baru solo
-- supaya user bisa start over.

-- ============================================================
-- WORKSPACE_INVITES
-- ============================================================
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

create index if not exists workspace_invites_token_idx
  on public.workspace_invites(token);
create index if not exists workspace_invites_workspace_idx
  on public.workspace_invites(workspace_id, created_at desc);

alter table public.workspace_invites enable row level security;

drop policy if exists "wi_select_member" on public.workspace_invites;
create policy "wi_select_member" on public.workspace_invites for select
  using (
    public.is_workspace_member(workspace_id)
    or created_by = auth.uid()
  );

drop policy if exists "wi_insert_self" on public.workspace_invites;
create policy "wi_insert_self" on public.workspace_invites for insert
  with check (
    created_by = auth.uid()
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists "wi_delete_self" on public.workspace_invites;
create policy "wi_delete_self" on public.workspace_invites for delete
  using (created_by = auth.uid());

-- ============================================================
-- RPC: create_workspace_invite
-- ============================================================
create or replace function public.create_workspace_invite(
  p_workspace_id uuid,
  p_expires_in_hours int default 168
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_token text;
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'not_a_member';
  end if;
  -- URL-safe 22-char token derived from 16 random bytes.
  new_token := rtrim(
    replace(replace(encode(gen_random_bytes(16), 'base64'), '+', '-'), '/', '_'),
    '='
  );
  insert into public.workspace_invites (workspace_id, token, created_by, expires_at)
  values (
    p_workspace_id,
    new_token,
    caller,
    case when p_expires_in_hours is null or p_expires_in_hours <= 0
      then null
      else now() + (p_expires_in_hours || ' hours')::interval
    end
  );
  return new_token;
end;
$$;

grant execute on function public.create_workspace_invite(uuid, int) to authenticated;

-- ============================================================
-- RPC: consume_workspace_invite
-- ============================================================
-- Idempotent: if the caller already used this invite, return the workspace_id.
-- Blocks reuse by a different user once consumed.
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
  limit 1;
  if not found then
    raise exception 'invite_not_found';
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;
  if inv.used_at is not null and inv.used_by is not null and inv.used_by <> caller then
    raise exception 'invite_already_used';
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
  return inv.workspace_id;
end;
$$;

grant execute on function public.consume_workspace_invite(text, text) to authenticated;

-- ============================================================
-- RPC: leave_workspace
-- ============================================================
-- Removes caller from their current active workspace and provisions a fresh
-- solo workspace for them so the app has somewhere to land on next reload.
-- Returns the new workspace UUID.
create or replace function public.leave_workspace()
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
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;
  select active_workspace_id, name
    into current_ws, caller_name
    from public.profiles
    where id = caller;
  if current_ws is null then
    -- No active workspace: just create a fresh one.
    insert into public.workspaces (name, owner_id, shared_label)
    values ('Workspace ' || coalesce(caller_name, 'Saya'), caller, 'Berdua')
    returning id into new_ws;
    insert into public.workspace_members (workspace_id, user_id, member_name, role)
    values (new_ws, caller, coalesce(caller_name, 'Saya'), 'owner');
    update public.profiles
      set active_workspace_id = new_ws, updated_at = now()
      where id = caller;
    return new_ws;
  end if;
  delete from public.workspace_members
    where user_id = caller and workspace_id = current_ws;
  insert into public.workspaces (name, owner_id, shared_label)
  values ('Workspace ' || coalesce(caller_name, 'Saya'), caller, 'Berdua')
  returning id into new_ws;
  insert into public.workspace_members (workspace_id, user_id, member_name, role)
  values (new_ws, caller, coalesce(caller_name, 'Saya'), 'owner');
  update public.profiles
    set active_workspace_id = new_ws, updated_at = now()
    where id = caller;
  return new_ws;
end;
$$;

grant execute on function public.leave_workspace() to authenticated;
