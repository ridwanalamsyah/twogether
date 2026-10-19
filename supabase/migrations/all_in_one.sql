-- Twogether: the whole database in one script (migrations 0001–0009 and 0011).
-- Generated from supabase/migrations/; safe to run again on an existing project.
-- 0010_push_triggers.sql is separate: it needs your project ref + secret.

-- ════════════════════════════════════════════════════════════
-- 0001_init.sql
-- ════════════════════════════════════════════════════════════
-- Twogether — initial schema for shared cross-device sync
-- Every domain table is workspace-scoped (RLS) with last-write-wins via updated_at.

-- ============================================================
-- WORKSPACES & MEMBERS
-- ============================================================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_label text default 'Berdua',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

-- ============================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  birthday date,
  avatar text,
  active_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DOMAIN TABLES (all workspace_id scoped)
-- ============================================================

-- Helper: every domain table has these common columns.
-- id (text PK from client ULID), workspace_id, created_at, updated_at, deleted_at

create table if not exists public.transactions (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('in', 'out')),
  amount bigint not null,
  category text not null,
  who text not null,
  note text,
  date date not null,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists transactions_workspace_idx on public.transactions(workspace_id, date desc);

create table if not exists public.goals (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target bigint not null,
  category text not null,
  deadline date,
  emoji text,
  milestones jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists goals_workspace_idx on public.goals(workspace_id);

create table if not exists public.deposits (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  amount bigint not null,
  who text not null,
  note text,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists deposits_workspace_idx on public.deposits(workspace_id, goal_id);

create table if not exists public.checklists (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done int not null default 0,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.moments (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  cipher text,
  encrypted int not null default 0,
  date date not null,
  emoji text,
  tags text[],
  voice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.dashboards (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  layout jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preferences (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists preferences_user_key_uidx on public.preferences(user_id, key);

create table if not exists public.skripsi_chapters (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  number text not null,
  title text not null,
  subtitle text,
  progress int not null default 0,
  status text not null default '',
  note text,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.skripsi_bimbingan (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  dosen text,
  topic text not null,
  notes text,
  todo text,
  done int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.skripsi_meta (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  judul text,
  dosen text,
  target text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deadlines (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  category text not null,
  detail text,
  done int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.konten (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null,
  platform text,
  scheduled_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habits (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  bucket text not null,
  who text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habit_logs (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  date date not null,
  who text not null,
  done int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reflections (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood int not null,
  highlights text not null,
  who text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.recurring (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  amount bigint not null,
  category text not null,
  who text not null,
  note text,
  interval text not null,
  day_of_month int,
  next_due date not null,
  active int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.budgets (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  "limit" bigint not null,
  who text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.trips (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  emoji text,
  start_date date not null,
  end_date date not null,
  budget bigint not null,
  tag text not null,
  note text,
  packing text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.recurring_goals (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  amount bigint not null,
  who text not null,
  day_of_month int not null,
  next_due date not null,
  active int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ════════════════════════════════════════════════════════════
-- 0002_rls.sql
-- ════════════════════════════════════════════════════════════
-- Row Level Security: every domain row is accessible only to members of its workspace.

-- Enable RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.deposits enable row level security;
alter table public.checklists enable row level security;
alter table public.moments enable row level security;
alter table public.dashboards enable row level security;
alter table public.preferences enable row level security;
alter table public.skripsi_chapters enable row level security;
alter table public.skripsi_bimbingan enable row level security;
alter table public.skripsi_meta enable row level security;
alter table public.deadlines enable row level security;
alter table public.konten enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.reflections enable row level security;
alter table public.recurring enable row level security;
alter table public.budgets enable row level security;
alter table public.trips enable row level security;
alter table public.recurring_goals enable row level security;

-- Helper: is auth.uid() member of workspace?
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- ============================================================
-- WORKSPACES
-- ============================================================
drop policy if exists "ws_select" on public.workspaces;
create policy "ws_select" on public.workspaces for select
  using (public.is_workspace_member(id) or owner_id = auth.uid());

drop policy if exists "ws_insert" on public.workspaces;
create policy "ws_insert" on public.workspaces for insert
  with check (owner_id = auth.uid());

drop policy if exists "ws_update" on public.workspaces;
create policy "ws_update" on public.workspaces for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "ws_delete" on public.workspaces;
create policy "ws_delete" on public.workspaces for delete
  using (owner_id = auth.uid());

-- ============================================================
-- WORKSPACE_MEMBERS
-- ============================================================
drop policy if exists "wm_select" on public.workspace_members;
create policy "wm_select" on public.workspace_members for select
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists "wm_insert" on public.workspace_members;
create policy "wm_insert" on public.workspace_members for insert
  with check (
    -- only workspace owner can invite members; or self-add as owner during ws creation
    user_id = auth.uid()
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "wm_update" on public.workspace_members;
create policy "wm_update" on public.workspace_members for update
  using (user_id = auth.uid() or exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
  ));

drop policy if exists "wm_delete" on public.workspace_members;
create policy "wm_delete" on public.workspace_members for delete
  using (user_id = auth.uid() or exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
  ));

-- ============================================================
-- PROFILES
-- ============================================================
drop policy if exists "pf_select" on public.profiles;
create policy "pf_select" on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.workspace_members m1
      join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );

drop policy if exists "pf_insert" on public.profiles;
create policy "pf_insert" on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "pf_update" on public.profiles;
create policy "pf_update" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- DOMAIN TABLES — uniform policy: workspace members can do anything
-- ============================================================
do $$
declare
  t text;
  tables text[] := array[
    'transactions', 'goals', 'deposits', 'checklists', 'moments', 'dashboards',
    'preferences', 'skripsi_chapters', 'skripsi_bimbingan', 'skripsi_meta',
    'deadlines', 'konten', 'habits', 'habit_logs', 'reflections', 'recurring',
    'budgets', 'trips', 'recurring_goals'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%I_select" on public.%I;', t, t);
    execute format('create policy "%I_select" on public.%I for select using (public.is_workspace_member(workspace_id));', t, t);

    execute format('drop policy if exists "%I_insert" on public.%I;', t, t);
    execute format('create policy "%I_insert" on public.%I for insert with check (public.is_workspace_member(workspace_id));', t, t);

    execute format('drop policy if exists "%I_update" on public.%I;', t, t);
    execute format('create policy "%I_update" on public.%I for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));', t, t);

    execute format('drop policy if exists "%I_delete" on public.%I;', t, t);
    execute format('create policy "%I_delete" on public.%I for delete using (public.is_workspace_member(workspace_id));', t, t);
  end loop;
end $$;

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable replication so clients can subscribe to changes.
-- (Skips tables already added, so the script can be run again.)
do $$
declare t text;
begin
  foreach t in array array['transactions','goals','deposits','checklists','moments','dashboards','preferences','skripsi_chapters','skripsi_bimbingan','skripsi_meta','deadlines','konten','habits','habit_logs','reflections','recurring','budgets','trips','recurring_goals','workspaces','workspace_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- 0003_join.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0004_entries_items.sql
-- ════════════════════════════════════════════════════════════
-- Generic entries (date-stamped logs) and items (long-lived catalog rows)
-- to back the new tracker pages without exploding the schema.

create table if not exists public.entries (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  date date not null,
  value_num numeric,
  value_text text,
  who text,
  tags text[],
  payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists entries_ws_kind_date_idx
  on public.entries(workspace_id, kind, date desc);

create table if not exists public.items (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  status text,
  date date,
  due date,
  amount bigint,
  who text,
  tags text[],
  payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists items_ws_kind_idx on public.items(workspace_id, kind);

-- RLS
alter table public.entries enable row level security;
alter table public.items enable row level security;

drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries for select
  using (public.is_workspace_member(workspace_id));
drop policy if exists "entries_insert" on public.entries;
create policy "entries_insert" on public.entries for insert
  with check (public.is_workspace_member(workspace_id));
drop policy if exists "entries_update" on public.entries;
create policy "entries_update" on public.entries for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
drop policy if exists "entries_delete" on public.entries;
create policy "entries_delete" on public.entries for delete
  using (public.is_workspace_member(workspace_id));

drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items for select
  using (public.is_workspace_member(workspace_id));
drop policy if exists "items_insert" on public.items;
create policy "items_insert" on public.items for insert
  with check (public.is_workspace_member(workspace_id));
drop policy if exists "items_update" on public.items;
create policy "items_update" on public.items for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
drop policy if exists "items_delete" on public.items;
create policy "items_delete" on public.items for delete
  using (public.is_workspace_member(workspace_id));

-- Realtime
-- (Skips tables already added, so the script can be run again.)
do $$
declare t text;
begin
  foreach t in array array['entries','items'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- 0005_invites_and_leave.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0006_push.sql
-- ════════════════════════════════════════════════════════════
-- Web Push subscriptions (one row per device/browser).
--
-- The `notify` edge function reads these with the service role to deliver:
--   * "Kabar" pings from a partner (Database Webhook on entries INSERT)
--   * new Moments from a partner
--   * adzan reminders (scheduled, uses lat/lng stored here when enabled)

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_name text,
  p256dh text not null,
  auth text not null,
  -- Adzan reminders for this device (optional).
  adzan boolean not null default false,
  lat double precision,
  lng double precision,
  tz text,
  last_adzan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_ws_idx on public.push_subscriptions(workspace_id);

alter table public.push_subscriptions enable row level security;

-- Each person manages only their own devices.
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions for insert
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- 0007_media_storage.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0008_error_reports.sql
-- ════════════════════════════════════════════════════════════
-- Opt-in, anonymous crash reports (Pengaturan → Password & keamanan →
-- "Kirim laporan error"). No user or workspace id is stored. Apps may only
-- insert, and only when signed in (stops strangers filling the table with
-- the public anon key); reading is for the project owner in the dashboard.

create table if not exists public.error_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 2000),
  path text check (char_length(path) <= 200),
  user_agent text check (char_length(user_agent) <= 300)
);

alter table public.error_reports enable row level security;

drop policy if exists "error_reports_insert" on public.error_reports;
create policy "error_reports_insert" on public.error_reports
  for insert to authenticated with check (true);

-- ════════════════════════════════════════════════════════════
-- 0009_feedback.sql
-- ════════════════════════════════════════════════════════════
-- "Kirim masukan" in Pengaturan. Signed-in users may only insert; read the
-- messages in the Supabase dashboard (Table editor → feedback).

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  message text not null check (char_length(message) between 1 and 2000),
  app_version text check (char_length(app_version) <= 40),
  user_agent text check (char_length(user_agent) <= 300)
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert" on public.feedback;
create policy "feedback_insert" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- 0011_security_fixes.sql
-- ════════════════════════════════════════════════════════════
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
