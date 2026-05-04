import { getDB, type SyncOp, type SyncOpKind } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase";
import { pushDelete, pushOne, type SupaContext } from "@/services/supaSync";

/**
 * Offline-first sync engine.
 *
 * Architecture:
 *   1. Every write goes through `recordWrite` / `recordDelete` which
 *      (a) persists to IndexedDB and (b) appends a SyncOp to `outbox`.
 *   2. A drain loop runs whenever the browser comes online (or every 30s
 *      while online) and POSTs ops to the server.
 *   3. The server is expected to expose a single endpoint defined by
 *      NEXT_PUBLIC_SYNC_URL that accepts:
 *        { table, recordId, op, payload }  with last-write-wins semantics.
 *      When the env var is missing the queue still works locally — it just
 *      stays "pending" so users see the privacy-preserving offline behavior.
 *   4. Conflict resolution is last-write-wins by `updatedAt`. Records with
 *      `deletedAt` set are tombstones; we never resurrect them on merge.
 *
 * The default endpoint is intentionally HTTP-agnostic so this can plug into
 * Supabase functions, a custom API route, or a self-hosted backend.
 */

export type ConnectionState = "online" | "offline";

export type SyncListener = (snapshot: SyncSnapshot) => void;

export interface SyncSnapshot {
  pending: number;
  failed: number;
  syncing: boolean;
  lastSyncAt: number | null;
  connection: ConnectionState;
}

const SYNC_URL =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SYNC_URL ?? "" : "";

class SyncManager {
  private listeners = new Set<SyncListener>();
  private snapshot: SyncSnapshot = {
    pending: 0,
    failed: 0,
    syncing: false,
    lastSyncAt: null,
    connection: "online",
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private supaCtx: SupaContext | null = null;

  setSupaContext(ctx: SupaContext | null): void {
    this.supaCtx = ctx;
    if (ctx && this.snapshot.connection === "online") void this.drain();
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    this.snapshot.connection = navigator.onLine ? "online" : "offline";

    window.addEventListener("online", () => {
      this.snapshot.connection = "online";
      this.emit();
      void this.drain();
    });
    window.addEventListener("offline", () => {
      this.snapshot.connection = "offline";
      this.emit();
    });

    this.timer = setInterval(() => {
      if (this.snapshot.connection === "online") void this.drain();
    }, 30_000);

    void this.refreshCounts();
  }

  subscribe(fn: SyncListener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  getSnapshot(): SyncSnapshot {
    return this.snapshot;
  }

  /** Persist a new/updated record and enqueue it for sync. */
  async recordWrite<T extends { id: string }>(table: string, record: T): Promise<void> {
    const db = getDB();
    await (db.table(table) as unknown as { put(v: T): Promise<unknown> }).put(record);
    await db.outbox.add({
      table,
      recordId: record.id,
      op: "upsert",
      payload: JSON.stringify(record),
      enqueuedAt: Date.now(),
      attempts: 0,
    });
    await this.refreshCounts();
    if (this.snapshot.connection === "online") void this.drain();
  }

  /** Soft-delete (tombstone) and enqueue. */
  async recordDelete(
    table: string,
    recordId: string,
    userId: string,
  ): Promise<void> {
    const db = getDB();
    const tableRef = db.table(table) as unknown as {
      get(id: string): Promise<Record<string, unknown> | undefined>;
      put(v: Record<string, unknown>): Promise<unknown>;
    };
    const existing = await tableRef.get(recordId);
    const tombstone = {
      ...(existing ?? { id: recordId, userId }),
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      dirty: 1,
    };
    await tableRef.put(tombstone);
    await db.outbox.add({
      table,
      recordId,
      op: "delete",
      payload: JSON.stringify(tombstone),
      enqueuedAt: Date.now(),
      attempts: 0,
    });
    await this.refreshCounts();
    if (this.snapshot.connection === "online") void this.drain();
  }

  async drain(): Promise<void> {
    if (this.snapshot.syncing) return;
    if (this.snapshot.connection !== "online") return;

    this.snapshot.syncing = true;
    this.emit();
    try {
      const db = getDB();
      // Pull a small batch each tick so failures don't block the whole queue.
      const batch = await db.outbox.orderBy("seq").limit(20).toArray();
      if (!batch.length) return;

      for (const op of batch) {
        try {
          await this.dispatch(op);
          if (op.seq != null) await db.outbox.delete(op.seq);
          await this.markClean(op);
        } catch (err) {
          if (op.seq != null) {
            await db.outbox.update(op.seq, {
              attempts: op.attempts + 1,
              lastError: (err as Error).message,
            });
          }
          // Stop batch on first failure to preserve order; retry on next tick.
          break;
        }
      }
      this.snapshot.lastSyncAt = Date.now();
    } finally {
      this.snapshot.syncing = false;
      await this.refreshCounts();
    }
  }

  private async dispatch(op: SyncOp): Promise<void> {
    if (hasSupabase()) {
      if (!this.supaCtx) {
        // Auth not yet attached; keep op in queue.
        throw new Error("NO_AUTH");
      }
      const payload = JSON.parse(op.payload) as Record<string, unknown>;
      if (op.op === "delete") {
        await pushDelete(op.table, payload, this.supaCtx);
      } else {
        await pushOne(op.table, payload, this.supaCtx);
      }
      return;
    }
    if (!SYNC_URL) {
      throw new Error("NO_BACKEND");
    }
    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: op.table,
        recordId: op.recordId,
        op: op.op as SyncOpKind,
        payload: JSON.parse(op.payload),
      }),
      credentials: "include",
    });
    if (!res.ok) throw new Error(`sync_failed_${res.status}`);
  }

  private async markClean(op: SyncOp): Promise<void> {
    const db = getDB();
    const tableRef = db.table(op.table) as unknown as {
      update(id: string, patch: Record<string, unknown>): Promise<unknown>;
    };
    await tableRef.update(op.recordId, { dirty: 0 });
  }

  private async refreshCounts(): Promise<void> {
    const db = getDB();
    const all = await db.outbox.toArray();
    this.snapshot.pending = all.filter((o) => o.attempts < 3).length;
    this.snapshot.failed = all.filter((o) => o.attempts >= 3).length;
    this.emit();
  }

  private emit(): void {
    const snap = { ...this.snapshot };
    this.listeners.forEach((fn) => fn(snap));
  }
}

export const sync = new SyncManager();
