-- Notifikasi walau app ditutup: replaces the manual Database Webhooks and
-- the adzan cron from the README with one script.
--
-- Before running: deploy the `notify` edge function and set its secrets
-- (README → "Notifikasi push"), then replace the two values in the last
-- statement of this file:
--   <PROJECT_REF>    the xxxx in https://xxxx.supabase.co
--   <NOTIFY_SECRET>  the same random text you gave the function
-- Safe to run again (e.g. after changing the secret).

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Not exposed through the API: only the database itself reads this.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.notify_config (
  id int primary key default 1 check (id = 1),
  url text not null,
  secret text not null
);

-- Same body the old Database Webhook sent: {type, table, record}.
create or replace function private.notify_partner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cfg private.notify_config;
  rec jsonb := to_jsonb(new);
begin
  -- Only Kabar pings from `entries`; every new moment.
  if tg_table_name = 'entries' and rec->>'kind' is distinct from 'ping' then
    return new;
  end if;
  -- Already deleted, or an old record arriving late from a phone that was
  -- offline for hours: no point buzzing the partner now.
  if rec->>'deleted_at' is not null
     or (rec->>'created_at')::timestamptz < now() - interval '6 hours' then
    return new;
  end if;
  select * into cfg from private.notify_config where id = 1;
  if cfg.url is null then
    return new; -- not set up yet
  end if;
  perform net.http_post(
    url := cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', cfg.secret),
    body := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'record', rec)
  );
  return new;
end $$;

drop trigger if exists notify_partner_ping on public.entries;
create trigger notify_partner_ping after insert on public.entries
  for each row execute function private.notify_partner();

drop trigger if exists notify_partner_moment on public.moments;
create trigger notify_partner_moment after insert on public.moments
  for each row execute function private.notify_partner();

-- Adzan reminders for devices that switched them on, every 5 minutes.
create or replace function private.notify_adzan() returns void
language plpgsql security definer set search_path = '' as $$
declare
  cfg private.notify_config;
begin
  select * into cfg from private.notify_config where id = 1;
  if cfg.url is null then
    return;
  end if;
  perform net.http_post(
    url := cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', cfg.secret),
    body := '{"mode":"adzan"}'::jsonb
  );
end $$;

select cron.unschedule(jobid) from cron.job where jobname = 'twogether-adzan';
select cron.schedule('twogether-adzan', '*/5 * * * *', 'select private.notify_adzan()');

-- ⬇️ Ganti dua nilai ini dulu.
insert into private.notify_config (id, url, secret)
values (1, 'https://<PROJECT_REF>.supabase.co/functions/v1/notify', '<NOTIFY_SECRET>')
on conflict (id) do update set url = excluded.url, secret = excluded.secret;
