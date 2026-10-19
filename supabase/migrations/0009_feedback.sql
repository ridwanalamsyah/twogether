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
