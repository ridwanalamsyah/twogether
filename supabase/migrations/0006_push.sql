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
