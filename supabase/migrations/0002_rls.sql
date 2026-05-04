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
