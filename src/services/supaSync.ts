"use client";

import { getDB } from "@/lib/db";
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

/** Pulls all workspace data into Dexie (replaces local copies). */
export async function pullWorkspace(ctx: SupaContext): Promise<void> {
  if (pulling) return;
  pulling = true;
  try {
    const sb = getSupabase();
    if (!sb) return;
    const db = getDB();
    for (const [local, remote] of Object.entries(TABLE_MAP)) {
      const { data, error } = await sb
        .from(remote)
        .select("*")
        .eq("workspace_id", ctx.workspaceId);
      if (error) {
        console.warn(`[pull] ${remote}:`, error.message);
        continue;
      }
      if (!data || data.length === 0) continue;
      const records = data.map((r: Record<string, unknown>) =>
        fromRow(local, r, ctx.localUserId),
      );
      try {
        const tableRef = db.table(local) as unknown as {
          bulkPut(values: unknown[]): Promise<unknown>;
        };
        await tableRef.bulkPut(records);
      } catch (err) {
        console.warn(`[pull] dexie put ${local}:`, err);
      }
    }
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
            const rec = fromRow(local, payload.new, ctx.localUserId);
            await tableRef.put(rec);
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
