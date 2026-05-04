import { getDB } from "@/lib/db";

/**
 * Privacy controls: data ownership operations.
 *
 *  - `exportAll`     : produces a JSON dump of every record owned by the user.
 *                       The user can save this file as a personal backup.
 *  - `wipeLocal`     : clears the local IndexedDB stores for the user (used
 *                       when the user wants to remove the device from a
 *                       shared workspace without deleting the cloud copy).
 *  - `deleteAccount` : tombstones every record AND wipes local — the sync
 *                       queue propagates deletions to the backend, ensuring
 *                       full account erasure.
 *
 * Analytics: not implemented as a service here; we never collect telemetry
 * by default, and any future analytics MUST be opt-in and anonymized
 * (no userId / email / device fingerprint).
 */

const DOMAIN_TABLES = [
  "transactions",
  "goals",
  "deposits",
  "checklists",
  "moments",
  "dashboards",
  "preferences",
  "skripsiChapters",
  "skripsiBimbingan",
  "skripsiMeta",
  "deadlines",
  "konten",
  "habits",
  "habitLogs",
  "reflections",
  "recurring",
  "budgets",
] as const;

export interface ExportBundle {
  exportedAt: string;
  user: Record<string, unknown> | null;
  records: Record<string, unknown[]>;
  meta: {
    recordCount: number;
    note: string;
  };
}

export async function exportAll(userId: string): Promise<ExportBundle> {
  const db = getDB();
  const user = await db.users.get(userId);
  const records: Record<string, unknown[]> = {};
  let total = 0;

  for (const table of DOMAIN_TABLES) {
    const rows = await db
      .table(table)
      .where("userId")
      .equals(userId)
      .toArray();
    records[table] = rows;
    total += rows.length;
  }

  // Strip password hash before export — it's never useful outside the device.
  const safeUser = user
    ? Object.fromEntries(
        Object.entries(user).filter(([k]) => k !== "passwordHash"),
      )
    : null;

  return {
    exportedAt: new Date().toISOString(),
    user: safeUser,
    records,
    meta: {
      recordCount: total,
      note: "Bareng data export. All data is owned by you and was generated on-device.",
    },
  };
}

export function downloadExport(bundle: ExportBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bareng-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Build a CSV string for transactions. Standard RFC 4180-ish escaping: any
 * field containing comma, quote, or newline is quoted with embedded quotes
 * doubled. Works in Numbers/Excel/Google Sheets.
 */
export async function exportTransactionsCsv(userId: string): Promise<string> {
  const db = getDB();
  const rows = await db
    .table("transactions")
    .where("userId")
    .equals(userId)
    .filter((r: { deletedAt?: number }) => !r.deletedAt)
    .toArray();
  const header = ["date", "kind", "amount", "category", "who", "note"];
  const out = [header.join(",")];
  for (const r of rows as {
    date: string;
    kind: string;
    amount: number;
    category: string;
    who: string;
    note?: string;
  }[]) {
    out.push(
      [r.date, r.kind, r.amount, r.category, r.who, r.note ?? ""]
        .map(escapeCsv)
        .join(","),
    );
  }
  return out.join("\n");
}

function escapeCsv(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function wipeLocal(userId: string): Promise<void> {
  const db = getDB();
  for (const table of DOMAIN_TABLES) {
    await db.table(table).where("userId").equals(userId).delete();
  }
  await db.users.delete(userId);
  await db.outbox.clear();
}

/**
 * Tombstones every record so the sync engine propagates deletions, then
 * wipes local. Resolves once tombstones are written; the queue drains
 * asynchronously when the user is online.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDB();
  const ts = Date.now();

  for (const table of DOMAIN_TABLES) {
    const rows = await db.table(table).where("userId").equals(userId).toArray();
    for (const row of rows) {
      const r = row as { id?: string };
      if (!r.id) continue;
      await db.table(table).update(r.id, {
        deletedAt: ts,
        updatedAt: ts,
        dirty: 1,
      });
      await db.outbox.add({
        table,
        recordId: r.id,
        op: "delete",
        payload: JSON.stringify({ ...row, deletedAt: ts, updatedAt: ts }),
        enqueuedAt: ts,
        attempts: 0,
      });
    }
  }
  await db.users.update(userId, { deletedAt: ts, updatedAt: ts, dirty: 1 });
  await wipeLocal(userId);
}
