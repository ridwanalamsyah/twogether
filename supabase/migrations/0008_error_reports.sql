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
