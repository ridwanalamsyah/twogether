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
alter publication supabase_realtime add table public.entries, public.items;
