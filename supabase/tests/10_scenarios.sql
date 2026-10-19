-- Security & sync scenarios, run by scripts/test-db.sh after the migrations.
-- Users: A (Ridwan) and B (Alya) are a couple, C is a stranger.
\set ON_ERROR_STOP 1
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','a@x'),('00000000-0000-0000-0000-00000000000b','b@x'),('00000000-0000-0000-0000-00000000000c','c@x');
insert into public.profiles (id, name) values
 ('00000000-0000-0000-0000-00000000000a','Ridwan'),('00000000-0000-0000-0000-00000000000b','Alya'),('00000000-0000-0000-0000-00000000000c','Orang lain')
 on conflict do nothing;
insert into public.workspaces (id, name, owner_id) values ('11111111-1111-1111-1111-111111111111','A&B','00000000-0000-0000-0000-00000000000a');
insert into public.workspace_members (workspace_id, user_id, member_name, role) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','Ridwan','owner');
insert into public.workspaces (id, name, owner_id) values ('22222222-2222-2222-2222-222222222222','C solo','00000000-0000-0000-0000-00000000000c');
insert into public.workspace_members (workspace_id, user_id, member_name, role) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000c','C','owner');

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;

-- 1. Stranger C tries to add themselves to A's workspace directly.
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  insert into public.workspace_members (workspace_id, user_id, member_name, role) values ('11111111-1111-1111-1111-111111111111', auth.uid(), 'C', 'owner');
  raise exception 'FAIL 1: stranger inserted themselves';
exception when insufficient_privilege then raise notice 'PASS 1: stranger cannot self-insert'; end $$;
-- 1b. C tries to move own membership row into A's workspace.
do $$ declare n int; begin
  update public.workspace_members set workspace_id = '11111111-1111-1111-1111-111111111111' where user_id = auth.uid();
  get diagnostics n = row_count;
  raise exception 'FAIL 1b: moved row (% rows)', n;
exception when insufficient_privilege then raise notice 'PASS 1b: cannot move membership'; end $$;
reset role;

-- 2. A makes an invite link (gen_random_bytes in extensions), B uses it.
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_workspace_invite('11111111-1111-1111-1111-111111111111', 24) as tok \gset
select public.consume_workspace_invite(:'tok', 'Ridwan') = '11111111-1111-1111-1111-111111111111' as own_link_ok;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.consume_workspace_invite(:'tok', 'Alya') = '11111111-1111-1111-1111-111111111111' as "PASS 2: partner joined via link";
select public.consume_workspace_invite(:'tok', 'Alya') is not null as "PASS 2b: idempotent for same person";
-- 3. C tries the same link, then a new link, then the pasted code.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
reset role;

set role authenticated;
-- 3. Third person C: a fresh link from A, and the pasted code, are both refused (space full).
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a') \g /dev/null
select public.create_workspace_invite('11111111-1111-1111-1111-111111111111', 24) as tok2 \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c') \g /dev/null
\set QUIET on
do $$ begin
  perform public.join_workspace('11111111-1111-1111-1111-111111111111', 'C');
  raise exception 'FAIL 3a: third person joined by code';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'PASS 3a: code refused (%)', sqlerrm;
end $$;
select set_config('my.tok2', :'tok2', false) \g /dev/null
do $$ begin
  perform public.consume_workspace_invite(current_setting('my.tok2'), 'C');
  raise exception 'FAIL 3b: third person joined by new link';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'PASS 3b: new link refused (%)', sqlerrm;
end $$;
-- 3c. C cannot read A&B's data.
reset role;
insert into public.transactions (id, workspace_id, user_id, kind, amount, category, who, date, updated_at)
  values ('tx1','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','out',25000,'Makan','Ridwan','2026-10-19','2026-10-19 09:00+07');
set role authenticated;
do $$ declare n int; begin
  select count(*) into n from public.transactions;
  if n <> 0 then raise exception 'FAIL 3c: C sees % rows of A&B', n; end if;
  raise notice 'PASS 3c: C sees none of A&B transactions';
end $$;
-- 4. Stale edit: B's offline edit from earlier must not overwrite A's newer one.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a') \g /dev/null
update public.transactions set amount = 30000, updated_at = '2026-10-19 11:00+07' where id = 'tx1';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b') \g /dev/null
update public.transactions set amount = 99999, updated_at = '2026-10-19 10:00+07' where id = 'tx1';
do $$ declare a bigint; begin
  select amount into a from public.transactions where id = 'tx1';
  if a <> 30000 then raise exception 'FAIL 4: stale edit won (amount %)', a; end if;
  raise notice 'PASS 4: newer edit kept (amount 30000)';
end $$;
-- 4b. A newer edit still goes through, and a tombstone can be cleared (restore).
update public.transactions set amount = 31000, deleted_at = now(), updated_at = '2026-10-19 12:00+07' where id = 'tx1';
update public.transactions set deleted_at = null, updated_at = '2026-10-19 12:05+07' where id = 'tx1';
do $$ declare a bigint; d timestamptz; begin
  select amount, deleted_at into a, d from public.transactions where id = 'tx1';
  if a <> 31000 or d is not null then raise exception 'FAIL 4b: % %', a, d; end if;
  raise notice 'PASS 4b: newer edit + restore applied';
end $$;
-- 5. Notification trigger: a fresh ping calls notify; an old one and a non-ping do not.
reset role;
delete from net.calls;
set role authenticated;
insert into public.entries (id, workspace_id, user_id, kind, date, value_text, who, created_at)
  values ('p1','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000b','ping','2026-10-19','kangen','Alya', now());
insert into public.entries (id, workspace_id, user_id, kind, date, value_text, who, created_at)
  values ('p2','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000b','ping','2026-10-18','kangen','Alya', now() - interval '2 days');
insert into public.entries (id, workspace_id, user_id, kind, date, value_num, created_at)
  values ('w1','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000b','water','2026-10-19',3, now());
insert into public.moments (id, workspace_id, user_id, title, body, date)
  values ('m1','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000b','Jalan sore','','2026-10-19');
reset role;
do $$ declare n int; begin
  select count(*) into n from net.calls;
  if n <> 2 then raise exception 'FAIL 5: % calls (want 2: fresh ping + moment)', n; end if;
  if not exists (select 1 from net.calls where body->>'table' = 'entries' and body->'record'->>'value_text' = 'kangen'
                 and headers->>'x-notify-secret' = '<NOTIFY_SECRET>') then raise exception 'FAIL 5: payload shape'; end if;
  raise notice 'PASS 5: only the fresh ping and the moment notify, payload as the function expects';
end $$;
-- 6. A (owner) leaves: B becomes owner, A lands in a fresh solo space.
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a') \g /dev/null
select public.leave_workspace('11111111-1111-1111-1111-111111111111') as new_ws \gset
reset role;
do $$ declare o uuid; m int; begin
  select owner_id into o from public.workspaces where id = '11111111-1111-1111-1111-111111111111';
  select count(*) into m from public.workspace_members where workspace_id = '11111111-1111-1111-1111-111111111111';
  if o <> '00000000-0000-0000-0000-00000000000b' or m <> 1 then raise exception 'FAIL 6: owner % members %', o, m; end if;
  raise notice 'PASS 6: owner handed to partner, leaver removed';
end $$;
-- 6b. A can no longer read A&B.
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a') \g /dev/null
do $$ declare n int; begin
  select count(*) into n from public.transactions where workspace_id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'FAIL 6b: leaver still sees % rows', n; end if;
  raise notice 'PASS 6b: leaver no longer sees the old space';
end $$;
-- 7. Anonymous cannot write error reports / feedback; signed-in can.
reset role; set role anon;
do $$ begin
  insert into public.error_reports (message) values ('x');
  raise exception 'FAIL 7: anon wrote error_reports';
exception when insufficient_privilege then raise notice 'PASS 7: anon blocked from error_reports'; end $$;
reset role;
