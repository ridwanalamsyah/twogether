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
alter publication supabase_realtime add table
  public.transactions, public.goals, public.deposits, public.checklists,
  public.moments, public.dashboards, public.preferences,
  public.skripsi_chapters, public.skripsi_bimbingan, public.skripsi_meta,
  public.deadlines, public.konten, public.habits, public.habit_logs,
  public.reflections, public.recurring, public.budgets, public.trips,
  public.recurring_goals, public.workspaces, public.workspace_members;
