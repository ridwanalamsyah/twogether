"use client";

import { getDB } from "@/lib/db";
import { CURSOR_MARGIN_MS, nextCursor, shouldApplyRemote, type Versioned } from "@/services/merge";
import {
  TABLE_MAP,
  TABLE_MAP_REVERSE,
  fromRow,
  getSupabase,
  toRow,
} from "@/lib/supabase";

/**
 * Bridge layer between the local Dexie store and Supabase.
 *
 * Responsibilities:
 *  - Push: upsert a single record to Supabase (called from sync.ts dispatch).
 *  - Soft delete: mark deleted_at on the row.
 *  - Pull: download all rows for a workspace into Dexie (one-shot on signin).
 *  - Realtime: subscribe to changes for a workspace, mirror into Dexie.
 */

let activeChannel: ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]> | null = null;
let pulling = false;

export interface SupaContext {
  workspaceId: string; // uuid
  authUserId: string; // uuid (auth.uid())
  localUserId: string; // ULID used in Dexie userId column
}

export async function pushOne(
  table: string,
  record: Record<string, unknown>,
  ctx: SupaContext,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("supabase_unavailable");
  const remote = TABLE_MAP[table];
  if (!remote) throw new Error(`unmapped_table_${table}`);
  const row = toRow(table, record, ctx.workspaceId, ctx.authUserId);
  const { error } = await sb.from(remote).upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function pushDelete(
  table: string,
  record: Record<string, unknown>,
  ctx: SupaContext,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("supabase_unavailable");
  const remote = TABLE_MAP[table];
  if (!remote) throw new Error(`unmapped_table_${table}`);
  // Soft-delete: upsert with deleted_at so other clients see the tombstone.
  const row = toRow(table, record, ctx.workspaceId, ctx.authUserId);
  if (!row.deleted_at) row.deleted_at = new Date().toISOString();
  const { error } = await sb.from(remote).upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

interface PullState {
  /** Per remote table: newest updated_at (ms) already pulled. */
  cursors: Record<string, number>;
  fullAt: number;
}

const FULL_PULL_EVERY_MS = 24 * 60 * 60_000;

function pullKey(ws: string) {
  return `twogether:pull:${ws}`;
}

function readPullState(ws: string): PullState {
  try {
    const raw = localStorage.getItem(pullKey(ws));
    if (raw) return JSON.parse(raw) as PullState;
  } catch {
    /* storage blocked or corrupt: start over with a full pull */
  }
  return { cursors: {}, fullAt: 0 };
}

function writePullState(ws: string, state: PullState) {
  try {
    localStorage.setItem(pullKey(ws), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Put server rows into Dexie without clobbering newer or unsent local copies. */
async function mergeIntoLocal(local: string, records: Record<string, unknown>[]): Promise<void> {
  const tableRef = getDB().table(local) as unknown as {
    bulkGet(ids: string[]): Promise<(Versioned | undefined)[]>;
    bulkPut(values: unknown[]): Promise<unknown>;
  };
  const existing = await tableRef.bulkGet(records.map((r) => r.id as string));
  const fresh = records.filter((r, i) => shouldApplyRemote(existing[i], r as Versioned));
  if (fresh.length) await tableRef.bulkPut(fresh);
}

/**
 * Brings the partner's changes into Dexie. Normally only rows changed since
 * the last pull (minus a margin for phone clocks that run a bit off); a full
 * pull at sign-in, once a day, or when asked, so nothing slips through.
 */
export async function pullWorkspace(ctx: SupaContext, opts: { full?: boolean } = {}): Promise<void> {
  if (pulling) return;
  pulling = true;
  try {
    const sb = getSupabase();
    if (!sb) return;
    const state = readPullState(ctx.workspaceId);
    const full = opts.full || Date.now() - state.fullAt > FULL_PULL_EVERY_MS;
    let allOk = true;
    for (const [local, remote] of Object.entries(TABLE_MAP)) {
      let query = sb.from(remote).select("*").eq("workspace_id", ctx.workspaceId);
      const since = state.cursors[remote];
      if (!full && since) {
        query = query.gt("updated_at", new Date(since - CURSOR_MARGIN_MS).toISOString());
      }
      const { data, error } = await query;
      if (error) {
        console.warn(`[pull] ${remote}:`, error.message);
        allOk = false;
        continue;
      }
      if (!data || data.length === 0) continue;
      const records = data.map((r: Record<string, unknown>) =>
        fromRow(local, r, ctx.localUserId),
      );
      try {
        await mergeIntoLocal(local, records);
        const cursor = nextCursor(state.cursors[remote] ?? null, records as Versioned[]);
        if (cursor) state.cursors[remote] = cursor;
      } catch (err) {
        console.warn(`[pull] dexie put ${local}:`, err);
        allOk = false;
      }
    }
    if (full && allOk) state.fullAt = Date.now();
    writePullState(ctx.workspaceId, state);
  } finally {
    pulling = false;
  }
}

/** Subscribes to realtime changes for the active workspace. */
export function subscribeRealtime(ctx: SupaContext): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  // Tear down any prior channel
  if (activeChannel) {
    void sb.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channel = sb.channel(`ws:${ctx.workspaceId}`);
  for (const [local, remote] of Object.entries(TABLE_MAP)) {
    channel.on(
      "postgres_changes" as never,
      {
        event: "*",
        schema: "public",
        table: remote,
        filter: `workspace_id=eq.${ctx.workspaceId}`,
      },
      async (payload: { new?: Record<string, unknown>; old?: Record<string, unknown>; eventType: string }) => {
        try {
          const db = getDB();
          const tableRef = db.table(local) as unknown as {
            put(v: unknown): Promise<unknown>;
            delete(id: string): Promise<unknown>;
          };
          if (payload.eventType === "DELETE") {
            const id = (payload.old?.id as string | undefined) ?? "";
            if (id) await tableRef.delete(id);
            return;
          }
          if (payload.new) {
            await mergeIntoLocal(local, [fromRow(local, payload.new, ctx.localUserId)]);
          }
        } catch (err) {
          console.warn(`[realtime] ${remote}:`, err);
        }
      },
    );
  }
  channel.subscribe();
  activeChannel = channel;
  return () => {
    if (activeChannel) {
      void sb.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}

/** Helper: ensure that local table name maps to remote and vice versa. */
export function isSupportedTable(local: string): boolean {
  return local in TABLE_MAP;
}

export function localTableForRemote(remote: string): string | undefined {
  return TABLE_MAP_REVERSE[remote];
}
