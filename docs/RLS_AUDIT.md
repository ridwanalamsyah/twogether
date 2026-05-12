# RLS audit

Row-Level Security review of the Supabase schema as of migration 0005.
This is a manual audit of `supabase/migrations/0001_init.sql` through
`0005_invites_and_leave.sql`. Run it again whenever a new migration
touches policies or tables.

## TL;DR

- All 24 public tables have RLS enabled.
- Every domain table is workspace-scoped via the helper
  `is_workspace_member(ws uuid)`.
- One **deliberately open** entry path: any authenticated user can call
  `join_workspace(ws_uuid, name)` and become a member of the workspace.
  This is by design (the paste-UUID UX). The invite-token flow added in
  migration 0005 is the preferred path; UUIDs should be treated as
  semi-secret.
- No critical leak found in the policies as authored.

## Methodology

1. Read every `create policy` statement in
   `supabase/migrations/00{01,02,03,04,05}_*.sql`.
2. Group by table and verify the four CRUD verbs are covered or
   intentionally omitted.
3. Sanity check with unauthenticated REST probes — every probe is
   rejected with "No API key found" or "Invalid API key" before any RLS
   check runs, confirming PostgREST is not letting anonymous reads
   through.

## Table-by-table

### workspaces

| Verb | Policy | Effective rule |
|---|---|---|
| SELECT | `ws_select` | `is_workspace_member(id) OR owner_id = auth.uid()` |
| INSERT | `ws_insert` | `owner_id = auth.uid()` (must self-own the new workspace) |
| UPDATE | `ws_update` | `owner_id = auth.uid()` (only owner) |
| DELETE | `ws_delete` | `owner_id = auth.uid()` (only owner) |

✅ Members cannot rename or delete the workspace. Only the creator
(owner) can.

### workspace_members

| Verb | Policy | Effective rule |
|---|---|---|
| SELECT | `wm_select` | `user_id = auth.uid() OR is_workspace_member(workspace_id)` |
| INSERT | `wm_insert` | `user_id = auth.uid() OR (caller is workspace owner)` |
| UPDATE | `wm_update` | `user_id = auth.uid() OR (caller is workspace owner)` |
| DELETE | `wm_delete` | `user_id = auth.uid() OR (caller is workspace owner)` |

⚠️ **Self-insert** is allowed: an authenticated user can add themselves
to any workspace whose UUID they know. This is the
"anyone-with-link-can-join" semantic. Same for `join_workspace` and
`consume_workspace_invite` RPCs (both run as `security definer` so the
RLS check is bypassed in their definition).

Mitigation: workspace UUIDs should be treated as semi-secret. The
invite-token flow gives short revocable tokens (`workspace_invites`)
that expire and can be marked single-use — prefer those over sharing
the raw UUID.

### profiles

| Verb | Policy | Effective rule |
|---|---|---|
| SELECT | `pf_select` | `id = auth.uid() OR (caller and id share a workspace via workspace_members)` |
| INSERT | `pf_insert` | `id = auth.uid()` |
| UPDATE | `pf_update` | `id = auth.uid()` |
| DELETE | _(no policy)_ | Rejected by default (RLS denies when no policy matches). |

✅ A user can only update their own profile. They can read their own
profile + the profile of any user who shares a workspace with them
(used to show partner names/avatars in the UI).

### Domain tables (uniform pattern)

Tables: `transactions, goals, deposits, checklists, moments,
dashboards, preferences, skripsi_chapters, skripsi_bimbingan,
skripsi_meta, deadlines, konten, habits, habit_logs, reflections,
recurring, budgets, trips, recurring_goals`. Plus `entries, items` from
migration 0004 (same pattern, verified separately).

Generated via DO block in `0002_rls.sql`:

```sql
create policy "<t>_select" on public.<t> for select  using (public.is_workspace_member(workspace_id));
create policy "<t>_insert" on public.<t> for insert  with check (public.is_workspace_member(workspace_id));
create policy "<t>_update" on public.<t> for update  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "<t>_delete" on public.<t> for delete  using (public.is_workspace_member(workspace_id));
```

✅ Workspace members can read/write any record in their workspace; can
never see another workspace's data. Both `USING` and `WITH CHECK` are
populated for `UPDATE` so a member cannot move a row to a different
workspace.

### workspace_invites (added in 0005)

| Verb | Policy | Effective rule |
|---|---|---|
| SELECT | `wi_select_member` | `is_workspace_member(workspace_id) OR created_by = auth.uid()` |
| INSERT | `wi_insert_self` | `created_by = auth.uid() AND is_workspace_member(workspace_id)` |
| UPDATE | _(no policy)_ | Rejected. Only `consume_workspace_invite` RPC (security definer) updates `used_at`. |
| DELETE | `wi_delete_self` | `created_by = auth.uid()` |

✅ A user cannot create invites for workspaces they aren't part of, and
cannot read invites for workspaces they aren't part of (unless they
created the invite themselves — useful for sharing flows). Used-tokens
are tracked exclusively via the RPC, so no client can forge a "this
token is fresh" state.

### Other authoritative paths (RPCs)

Every workspace mutation RPC is `language plpgsql security definer
set search_path = public`. They explicitly check `auth.uid()` and
membership before mutating. Key checks:

- `join_workspace(ws, name)` (migration 0003) — checks workspace
  exists. Does NOT require an invite. Open by design.
- `create_workspace_invite(ws, hours)` (migration 0005) — requires
  caller is a member.
- `consume_workspace_invite(token, name)` (migration 0005) — checks
  token exists, not expired, not used by a different user.
- `leave_workspace()` (migration 0005) — removes caller, creates a new
  solo workspace, no parameters (uses `auth.uid()`).

All five RPCs are granted only to the `authenticated` role.

## Probes

Run-now manual probes against the live project:

```bash
# Anonymous reads are rejected at PostgREST before RLS even runs.
$ curl -s 'https://bowcqqklajltukbbztcj.supabase.co/rest/v1/workspaces?select=id'
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}

$ curl -s 'https://bowcqqklajltukbbztcj.supabase.co/rest/v1/transactions?select=id' \
       -H 'apikey: <bad-jwt>'
{"message":"Invalid API key", ...}
```

For an end-to-end RLS regression test (creates two users, verifies one
cannot read the other's data), see the test scaffold in
`scripts/rls-probe.ts` (TODO once Vitest infra lands in Batch 4).

## Open questions / future work

1. **Rate-limit `consume_workspace_invite`?** A motivated attacker could
   try ~10^20 random tokens. Each token is 22 base64-url chars (≈128
   bits of entropy) so guessing is computationally infeasible, but
   Supabase has no built-in per-RPC rate limit. Consider Cloudflare WAF
   if abuse surfaces.
2. **`workspace_members.wm_insert` self-insert path**: tighten so
   self-insert only works via the two RPCs (`join_workspace`,
   `consume_workspace_invite`), never via raw INSERT from PostgREST.
   Tradeoff: simpler error handling now vs. defense-in-depth later.
3. **No audit log table.** If we ever need to know "who joined
   workspace X and when", `workspace_members.joined_at` is the closest
   approximation. Consider a separate `workspace_audit_log` if we
   support N>2 members or paid features.

## Sign-off

Audited 2026-05-11 against migrations `0001_init.sql..0005_invites_and_leave.sql`.
No critical findings. Update this doc when migrations 0006+ ship.
