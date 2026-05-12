# Sync architecture & conflict resolution

This document describes how Twogether keeps local IndexedDB and the remote
Supabase backend in sync, and how conflicts are resolved when two members of
the same workspace mutate the same record offline.

## Stores at a glance

| Layer | Tech | Role |
|---|---|---|
| Local | Dexie (`src/lib/db.ts`) | Source of truth for the UI. Always reads from here. Persistent in IndexedDB. |
| Outbox | Dexie `outbox` table | Durable queue of pending writes; survives page reloads. |
| Remote | Supabase Postgres | Server-side canonical store. Realtime channel pushes changes back to clients. |

UI hooks (in `src/stores/data.ts`) read **only** from Dexie via
`useLiveQuery`. They never block on the network — that's what makes the app
work offline.

## Write path

```
        UI mutation
            v
sync.recordWrite(table, record)
            |
            +--> dexie.<table>.put(record)         <-- UI sees change instantly
            |
            +--> dexie.outbox.add({op, payload})   <-- durable queue entry
            |
            v
       sync.drain()  (every 30s while online + on `online` event)
            |
            v
   supaSync.pushOne(...)
            |
            v
    sb.from(remote).upsert({ ..., workspace_id, user_id })
```

`drain()` processes the outbox in batches of 20, keyed by insertion order
(`seq`). Failures bump an `attempts` counter — there's no exponential backoff
yet, just the next 30s tick.

## Delete path

Deletes are **soft-deletes**. `sync.recordDelete` writes a tombstone with
`deletedAt` set, then enqueues a `delete` op. `supaSync.pushDelete` upserts
the row to Supabase with `deleted_at` populated. Other clients receive the
update via realtime and respect the tombstone (never resurrect it).

The privacy "wipe local" flow (`services/privacy.ts:wipeLocal`) **does not**
write tombstones — it just clears the local Dexie tables. The cloud copy is
preserved. This is how a user can leave a shared device without touching
their partner's data.

`deleteAccount` is the heavier sibling: it tombstones every record (so the
deletions propagate to the cloud on next sync) and then wipes local.

## Pull path

When a user signs in or workspace context changes, `supaSync.pullWorkspace`
runs a one-shot fetch:

```
for table in TABLE_MAP:
   sb.from(remote).select("*").eq("workspace_id", ctx.workspaceId)
   dexie.<local>.bulkPut(rows.map(fromRow))
```

After that, `supaSync.subscribeRealtime` opens a Supabase realtime channel
filtered by `workspace_id=eq.${ctx.workspaceId}` and mirrors live changes
into Dexie as they arrive.

## Conflict resolution

**Strategy: last-write-wins, keyed by `updatedAt`.**

Every record in Dexie and Supabase has an `updated_at` timestamp written
every time the record is mutated. The `upsert` in `pushOne` uses
`onConflict: "id"` and is unconditional — the row in Supabase is overwritten
by whichever write arrives at the server last.

Concrete scenarios:

| Scenario | Outcome |
|---|---|
| A and B both offline, both edit the same goal | Whoever reconnects last wins. The earlier writer's edit is overwritten on the server, then the realtime channel pushes the winning row back to the loser's Dexie. |
| A deletes a goal, B edits it offline | If A's delete arrives first and B's edit arrives second, B's edit revives the row in Supabase (because upsert ignores `deleted_at` unless explicitly set). **This is a known sharp edge** — see below. |
| Two clients of the same user (e.g. phone + laptop) | Same LWW semantics. There's no per-device dirty bit. |

### Tombstone resurrection sharp edge

`pushOne` upserts the *record as-is*. If a record in Dexie has no
`deletedAt` set, `toRow` writes `deleted_at: null` and upserts. If the
server already had `deleted_at` set, the upsert overwrites it back to null —
effectively un-deleting the row.

Mitigations in place today:
1. The delete path (`recordDelete` -> `pushDelete`) explicitly sets
   `deleted_at` before upserting, so deletes can't be lost on the way out.
2. Realtime pushes the tombstone back to all clients quickly, so windows
   for offline edits to resurrect a deleted row are usually small.

If we ever see resurrection bugs in practice, the fix is to have `pushOne`
read the server's `updated_at` before upsert (compare-and-swap) — but this
adds latency to every write. Worth doing only when needed.

### Why not CRDTs?

For a 2-person workspace, true concurrent edits to the same record are
rare. The UX cost of LWW (occasional lost edit) is much smaller than the
implementation cost of CRDT merging + the storage overhead of operation
logs. If we ever expand to N>5 collaborators per workspace, revisit this.

## What gets synced

The `TABLE_MAP` in `src/lib/supabase.ts` defines the mapping. Tables not in
this map (e.g. local-only preferences, ephemeral checklists) are
intentionally excluded from sync.

## Service worker / PWA state

`public/sw.js` is a **self-uninstalling** service worker. `PWAInstaller`
(`src/components/sync/PWAInstaller.tsx`) also actively unregisters any SW
on mount and clears caches. Twogether does not currently use a service
worker for offline caching — IndexedDB handles all offline data needs.

`src/components/shell/PWAUpdateBanner.tsx` listens for SW updates and shows
a "Reload" prompt. With the current setup it never fires (nothing is
registered). It's kept in place so that if/when a real SW is reintroduced
for shell caching, the upgrade-prompt UX is ready to go.

## When sync silently no-ops

- `NEXT_PUBLIC_SYNC_URL` is unset / `getSupabase()` returns null: writes
  still go to Dexie and outbox, but nothing leaves the device.
- Workspace context not set (sync.supaCtx === null): same as above.
- `navigator.onLine === false`: outbox grows; drain runs again when the
  browser fires the `online` event.

These behaviors are all intentional and expose themselves to the user via
the `OfflineBanner` and the pending-count in `SyncSnapshot`.
