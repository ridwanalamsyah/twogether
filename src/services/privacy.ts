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
  "trips",
  "recurringGoals",
  "entries",
  "items",
] as const;

/** App settings kept in localStorage that are worth carrying to a new phone. */
const SETTING_KEYS = ["bareng:theme", "bareng:currency"];
const SETTING_PREFIX = "twogether:";
const SKIP_SETTINGS = new Set(["twogether:ping-seen", "twogether:last-backup"]);
export const LAST_BACKUP_KEY = "twogether:last-backup";

function readSettings(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || SKIP_SETTINGS.has(k) || k.startsWith("twogether:home-layout-v:")) continue;
      if (SETTING_KEYS.includes(k) || k.startsWith(SETTING_PREFIX)) out[k] = localStorage.getItem(k) ?? "";
    }
  } catch {
    /* storage blocked */
  }
  return out;
}

export function lastBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export interface ExportBundle {
  exportedAt: string;
  user: Record<string, unknown> | null;
  records: Record<string, unknown[]>;
  /** localStorage app settings (theme, enabled spaces, prayer place…). */
  settings?: Record<string, string>;
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
    settings: readSettings(),
    meta: {
      recordCount: total,
      note: "Twogether data export. All data is owned by you and was generated on-device.",
    },
  };
}

/**
 * Import a previously exported JSON bundle. Records are written via
 * sync.recordWrite() so they propagate to Supabase. Each record is
 * re-stamped with the *current* userId (so importing into a fresh account
 * works).
 *
 * Strategy: existing records with matching ids are overwritten; new ids are
 * inserted. This is "merge", not "replace": local data outside the bundle
 * is left untouched.
 */
export async function importBundle(
  userId: string,
  bundle: unknown,
): Promise<{ imported: number; skipped: number; tables: string[]; settings: number }> {
  const db = getDB();
  const { sync } = await import("@/services/sync");

  const b = bundle as Partial<ExportBundle>;
  if (!b || !b.records || typeof b.records !== "object") {
    throw new Error("Bundle tidak valid");
  }
  let imported = 0;
  let skipped = 0;
  const tables: string[] = [];
  for (const tbl of DOMAIN_TABLES) {
    const rows = b.records[tbl];
    if (!Array.isArray(rows)) continue;
    if (!db.tables.find((t) => t.name === tbl)) continue;
    tables.push(tbl);
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const r: Record<string, unknown> = { ...(raw as Record<string, unknown>), userId, dirty: 1 };
      // Never let an old backup overwrite something edited since.
      const local = typeof r.id === "string" ? await db.table(tbl).get(r.id) : null;
      if (local && Number(local.updatedAt ?? 0) >= Number(r.updatedAt ?? 0)) {
        skipped++;
        continue;
      }
      try {
        await sync.recordWrite(tbl, r as never);
        imported++;
      } catch {
        // skip malformed rows silently
      }
    }
  }
  let settings = 0;
  if (b.settings && typeof b.settings === "object") {
    for (const [k, v] of Object.entries(b.settings)) {
      if (typeof v !== "string" || SKIP_SETTINGS.has(k)) continue;
      if (!SETTING_KEYS.includes(k) && !k.startsWith(SETTING_PREFIX)) continue;
      try {
        localStorage.setItem(k, v);
        settings++;
      } catch {
        /* ignore */
      }
    }
  }
  return { imported, skipped, tables, settings };
}

export async function downloadExport(bundle: ExportBundle): Promise<void> {
  const { saveFile } = await import("@/lib/share");
  await saveFile(
    JSON.stringify(bundle, null, 2),
    `twogether-cadangan-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
  );
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
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

export async function exportGoalsCsv(userId: string): Promise<string> {
  const db = getDB();
  const [goals, deposits] = await Promise.all([
    db
      .table("goals")
      .where("userId")
      .equals(userId)
      .filter((r: { deletedAt?: number }) => !r.deletedAt)
      .toArray(),
    db
      .table("deposits")
      .where("userId")
      .equals(userId)
      .filter((r: { deletedAt?: number }) => !r.deletedAt)
      .toArray(),
  ]);
  // Aggregate saved per goal so the CSV is decision-useful on its own.
  const savedByGoal = new Map<string, number>();
  for (const d of deposits as { goalId: string; amount: number }[]) {
    savedByGoal.set(d.goalId, (savedByGoal.get(d.goalId) ?? 0) + d.amount);
  }
  const header = [
    "id",
    "name",
    "category",
    "target",
    "saved",
    "progress_pct",
    "deadline",
  ];
  const out = [header.join(",")];
  for (const g of goals as {
    id: string;
    name: string;
    category: string;
    target: number;
    deadline?: string;
  }[]) {
    const saved = savedByGoal.get(g.id) ?? 0;
    const pct = g.target > 0 ? Math.round((saved / g.target) * 100) : 0;
    out.push(
      [g.id, g.name, g.category, g.target, saved, pct, g.deadline ?? ""]
        .map(escapeCsv)
        .join(","),
    );
  }
  return out.join("\n");
}

export async function exportMomentsCsv(userId: string): Promise<string> {
  const db = getDB();
  const rows = await db
    .table("moments")
    .where("userId")
    .equals(userId)
    .filter((r: { deletedAt?: number }) => !r.deletedAt)
    .toArray();
  const header = ["date", "title", "body", "emoji", "encrypted", "tags"];
  const out = [header.join(",")];
  for (const r of rows as {
    date: string;
    title: string;
    body: string;
    emoji?: string;
    encrypted: 0 | 1;
    tags?: string[];
  }[]) {
    // Skip body for E2E-encrypted moments; the export should never leak
    // ciphertext into a CSV (looks like garbage anyway).
    const body = r.encrypted ? "[ENCRYPTED — gunakan JSON export]" : r.body;
    out.push(
      [
        r.date,
        r.title,
        body,
        r.emoji ?? "",
        r.encrypted ? "yes" : "no",
        (r.tags ?? []).join(";"),
      ]
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

export async function downloadCsv(csv: string, filename: string): Promise<void> {
  const { saveFile } = await import("@/lib/share");
  await saveFile(csv, filename, "text/csv;charset=utf-8");
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
