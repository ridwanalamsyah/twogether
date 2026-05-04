"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  getDB,
  newId,
  now,
  type ChecklistRecord,
  type DeadlineRecord,
  type DepositRecord,
  type GoalRecord,
  type HabitLogRecord,
  type HabitRecord,
  type KontenRecord,
  type MomentRecord,
  type ReflectionRecord,
  type SkripsiBimbinganRecord,
  type SkripsiChapterRecord,
  type SkripsiMetaRecord,
  type TransactionRecord,
  type RecurringRecord,
  type BudgetRecord,
  type TripRecord,
  type RecurringGoalRecord,
  type EntryRecord,
  type ItemRecord,
} from "@/lib/db";
import { sync } from "@/services/sync";
import { decryptString, encryptString, isUnlocked } from "@/lib/crypto";

/**
 * Live data hooks — Dexie's `useLiveQuery` re-renders components when the
 * underlying IndexedDB tables change. All mutations route through `sync` so
 * they're queued for the backend automatically.
 */

export function useTransactions(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.transactions
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("date");
  }, [userId]);
}

export function useGoals(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.goals
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export function useDeposits(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.deposits
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("date");
  }, [userId]);
}

export function useChecklists(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.checklists
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export function useMoments(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.moments
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("date");
  }, [userId]);
}

/* ───── Mutations ───── */

export async function addTransaction(
  userId: string,
  input: Pick<TransactionRecord, "kind" | "amount" | "category" | "who" | "note" | "date"> & {
    tags?: string[];
  },
) {
  const record: TransactionRecord = {
    id: newId(),
    userId,
    createdAt: now(),
    updatedAt: now(),
    dirty: 1,
    ...input,
  };
  await sync.recordWrite("transactions", record);
  return record;
}

export async function deleteTransaction(userId: string, id: string) {
  await sync.recordDelete("transactions", id, userId);
}

export async function upsertGoal(
  userId: string,
  input: Omit<GoalRecord, "id" | "userId" | "createdAt" | "updatedAt" | "dirty"> & {
    id?: string;
  },
) {
  const db = getDB();
  const existing = input.id ? await db.goals.get(input.id) : null;
  const record: GoalRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    name: input.name,
    target: input.target,
    category: input.category,
    deadline: input.deadline,
    emoji: input.emoji,
    milestones: input.milestones ?? existing?.milestones,
  };
  await sync.recordWrite("goals", record);
  return record;
}

export async function deleteGoal(userId: string, id: string) {
  await sync.recordDelete("goals", id, userId);
}

export async function addDeposit(
  userId: string,
  input: Pick<DepositRecord, "goalId" | "amount" | "who" | "note" | "date">,
) {
  const record: DepositRecord = {
    id: newId(),
    userId,
    createdAt: now(),
    updatedAt: now(),
    dirty: 1,
    ...input,
  };
  await sync.recordWrite("deposits", record);
  // Lightweight activity feed for kudos
  try {
    const { emitFeed } = await import("@/services/feed");
    const { formatRupiah } = await import("@/lib/utils");
    await emitFeed(userId, {
      who: input.who,
      type: "deposit",
      text: `Setoran ${formatRupiah(input.amount)} ke goal`,
      amount: input.amount,
    });
  } catch {}
  return record;
}

export async function deleteDeposit(userId: string, id: string) {
  await sync.recordDelete("deposits", id, userId);
}

export async function upsertChecklist(
  userId: string,
  input: Omit<
    ChecklistRecord,
    "id" | "userId" | "createdAt" | "updatedAt" | "dirty"
  > & {
    id?: string;
  },
) {
  const db = getDB();
  const existing = input.id ? await db.checklists.get(input.id) : null;
  const record: ChecklistRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    title: input.title,
    done: input.done,
    date: input.date,
  };
  await sync.recordWrite("checklists", record);
  return record;
}

export async function deleteChecklist(userId: string, id: string) {
  await sync.recordDelete("checklists", id, userId);
}

/**
 * Moments are encrypted at rest when the user has a key unlocked.
 * The plaintext is replaced with a ciphertext blob in `cipher` and the
 * `body` field is cleared so even a leaked DB dump can't read it.
 */
export async function upsertMoment(
  userId: string,
  input: {
    id?: string;
    title: string;
    body: string;
    date: string;
    emoji?: string;
    tags?: string[];
    voice?: string;
  },
  options: { encrypt?: boolean } = {},
): Promise<MomentRecord> {
  const db = getDB();
  const existing = input.id ? await db.moments.get(input.id) : null;
  const wantsEncrypt = options.encrypt ?? false;

  let body = input.body;
  let cipher: string | undefined;
  let encrypted: 0 | 1 = 0;
  if (wantsEncrypt && isUnlocked()) {
    cipher = await encryptString(input.body);
    body = "";
    encrypted = 1;
  }

  const record: MomentRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    title: input.title,
    body,
    cipher,
    encrypted,
    date: input.date,
    emoji: input.emoji,
    tags: input.tags ?? existing?.tags,
    voice: input.voice ?? existing?.voice,
  };
  await sync.recordWrite("moments", record);
  return record;
}

export async function readMomentBody(record: MomentRecord): Promise<string> {
  if (record.encrypted && record.cipher) {
    if (!isUnlocked()) return "🔒 Terkunci — masuk ulang untuk membaca";
    try {
      return await decryptString(record.cipher);
    } catch {
      return "🔒 Gagal mendekripsi";
    }
  }
  return record.body;
}

export async function deleteMoment(userId: string, id: string) {
  await sync.recordDelete("moments", id, userId);
}

/* ───── Skripsi ───── */

export const DEFAULT_SKRIPSI_CHAPTERS: Omit<
  SkripsiChapterRecord,
  "id" | "userId" | "createdAt" | "updatedAt" | "dirty"
>[] = [
  {
    number: "I",
    title: "Pendahuluan",
    subtitle: "Latar belakang, rumusan masalah & tujuan",
    progress: 0,
    status: "Belum mulai",
    order: 0,
  },
  {
    number: "II",
    title: "Tinjauan Pustaka",
    subtitle: "Landasan teori",
    progress: 0,
    status: "Belum mulai",
    order: 1,
  },
  {
    number: "III",
    title: "Metodologi",
    subtitle: "Metode penelitian",
    progress: 0,
    status: "Belum mulai",
    order: 2,
  },
  {
    number: "IV",
    title: "Hasil & Pembahasan",
    subtitle: "Analisis data lapangan & pembahasan",
    progress: 0,
    status: "Belum mulai",
    order: 3,
  },
  {
    number: "V",
    title: "Penutup",
    subtitle: "Simpulan, saran, dan rekomendasi",
    progress: 0,
    status: "Belum mulai",
    order: 4,
  },
];

export function useSkripsiChapters(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.skripsiChapters
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .sortBy("order");
  }, [userId]);
}

export function useSkripsiBimbingan(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.skripsiBimbingan
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("date");
  }, [userId]);
}

export function useSkripsiMeta(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return null;
    const db = getDB();
    return (
      (await db.skripsiMeta.where("userId").equals(userId).first()) ?? null
    );
  }, [userId]);
}

export async function ensureDefaultSkripsiChapters(userId: string) {
  const db = getDB();
  const count = await db.skripsiChapters
    .where("userId")
    .equals(userId)
    .count();
  if (count > 0) return;
  for (const c of DEFAULT_SKRIPSI_CHAPTERS) {
    const record: SkripsiChapterRecord = {
      id: newId(),
      userId,
      createdAt: now(),
      updatedAt: now(),
      dirty: 1,
      ...c,
    };
    await sync.recordWrite("skripsiChapters", record);
  }
}

export async function upsertSkripsiChapter(
  userId: string,
  input: Partial<SkripsiChapterRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.skripsiChapters.get(input.id) : null;
  const record: SkripsiChapterRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    number: input.number ?? existing?.number ?? "?",
    title: input.title ?? existing?.title ?? "Bab",
    subtitle: input.subtitle ?? existing?.subtitle,
    progress: input.progress ?? existing?.progress ?? 0,
    status: input.status ?? existing?.status ?? "Belum mulai",
    note: input.note ?? existing?.note,
    order: input.order ?? existing?.order ?? 0,
  };
  await sync.recordWrite("skripsiChapters", record);
  return record;
}

export async function deleteSkripsiChapter(userId: string, id: string) {
  await sync.recordDelete("skripsiChapters", id, userId);
}

export async function upsertSkripsiBimbingan(
  userId: string,
  input: Partial<SkripsiBimbinganRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.skripsiBimbingan.get(input.id) : null;
  const record: SkripsiBimbinganRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    date: input.date ?? existing?.date ?? new Date().toISOString().slice(0, 10),
    dosen: input.dosen ?? existing?.dosen,
    topic: input.topic ?? existing?.topic ?? "",
    notes: input.notes ?? existing?.notes,
    todo: input.todo ?? existing?.todo,
    done: input.done ?? existing?.done ?? 0,
  };
  await sync.recordWrite("skripsiBimbingan", record);
  return record;
}

export async function deleteSkripsiBimbingan(userId: string, id: string) {
  await sync.recordDelete("skripsiBimbingan", id, userId);
}

export async function upsertSkripsiMeta(
  userId: string,
  input: Partial<SkripsiMetaRecord>,
) {
  const db = getDB();
  const existing = await db.skripsiMeta.where("userId").equals(userId).first();
  const record: SkripsiMetaRecord = {
    id: existing?.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    judul: input.judul ?? existing?.judul ?? "",
    dosen: input.dosen ?? existing?.dosen ?? "",
    target: input.target ?? existing?.target ?? "",
  };
  await sync.recordWrite("skripsiMeta", record);
  return record;
}

/* ───── Deadlines ───── */

export function useDeadlines(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.deadlines
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .sortBy("date");
  }, [userId]);
}

export async function upsertDeadline(
  userId: string,
  input: Partial<DeadlineRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.deadlines.get(input.id) : null;
  const record: DeadlineRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    title: input.title ?? existing?.title ?? "",
    date: input.date ?? existing?.date ?? new Date().toISOString().slice(0, 10),
    category: input.category ?? existing?.category ?? "skripsi",
    detail: input.detail ?? existing?.detail,
    done: input.done ?? existing?.done ?? 0,
  };
  await sync.recordWrite("deadlines", record);
  return record;
}

export async function deleteDeadline(userId: string, id: string) {
  await sync.recordDelete("deadlines", id, userId);
}

/* ───── Konten ───── */

export function useKonten(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.konten
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export async function upsertKonten(
  userId: string,
  input: Partial<KontenRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.konten.get(input.id) : null;
  const record: KontenRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    title: input.title ?? existing?.title ?? "",
    status: input.status ?? existing?.status ?? "ide",
    platform: input.platform ?? existing?.platform,
    scheduledAt: input.scheduledAt ?? existing?.scheduledAt,
    note: input.note ?? existing?.note,
  };
  await sync.recordWrite("konten", record);
  return record;
}

export async function deleteKonten(userId: string, id: string) {
  await sync.recordDelete("konten", id, userId);
}

/* ───── Habits ───── */

export function useHabits(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.habits
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export function useHabitLogsForDate(userId: string | null, date: string) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.habitLogs
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt && r.date === date)
      .toArray();
  }, [userId, date]);
}

export async function upsertHabit(
  userId: string,
  input: Partial<HabitRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.habits.get(input.id) : null;
  const record: HabitRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    label: input.label ?? existing?.label ?? "",
    bucket: input.bucket ?? existing?.bucket ?? "Pagi",
    who: input.who ?? existing?.who,
  };
  await sync.recordWrite("habits", record);
  return record;
}

export async function deleteHabit(userId: string, id: string) {
  await sync.recordDelete("habits", id, userId);
}

export async function toggleHabitLog(
  userId: string,
  habitId: string,
  date: string,
  who: string,
) {
  const db = getDB();
  const existing = await db.habitLogs
    .where("userId")
    .equals(userId)
    .filter(
      (r) =>
        !r.deletedAt && r.habitId === habitId && r.date === date && r.who === who,
    )
    .first();
  const next: HabitLogRecord = {
    id: existing?.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    habitId,
    date,
    who,
    done: existing?.done ? 0 : 1,
  };
  await sync.recordWrite("habitLogs", next);
  return next;
}

/* ───── Reflections ───── */

export function useReflections(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.reflections
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("date");
  }, [userId]);
}

export async function upsertReflection(
  userId: string,
  input: Partial<ReflectionRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.reflections.get(input.id) : null;
  const record: ReflectionRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    date: input.date ?? existing?.date ?? new Date().toISOString().slice(0, 10),
    mood: (input.mood ?? existing?.mood ?? 3) as ReflectionRecord["mood"],
    highlights: input.highlights ?? existing?.highlights ?? "",
    who: input.who ?? existing?.who,
  };
  await sync.recordWrite("reflections", record);
  return record;
}

export async function deleteReflection(userId: string, id: string) {
  await sync.recordDelete("reflections", id, userId);
}

/* ───── Recurring transactions ───── */

export function useRecurring(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.recurring
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export async function upsertRecurring(
  userId: string,
  input: Partial<RecurringRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.recurring.get(input.id) : null;
  const record: RecurringRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    kind: input.kind ?? existing?.kind ?? "out",
    amount: input.amount ?? existing?.amount ?? 0,
    category: input.category ?? existing?.category ?? "Lainnya",
    who: input.who ?? existing?.who ?? "",
    note: input.note ?? existing?.note,
    interval: input.interval ?? existing?.interval ?? "monthly",
    dayOfMonth: input.dayOfMonth ?? existing?.dayOfMonth,
    nextDue:
      input.nextDue ??
      existing?.nextDue ??
      new Date().toISOString().slice(0, 10),
    active: (input.active ?? existing?.active ?? 1) as 0 | 1,
  };
  await sync.recordWrite("recurring", record);
  return record;
}

export async function deleteRecurring(userId: string, id: string) {
  await sync.recordDelete("recurring", id, userId);
}

/* ───── Budgets ───── */

export function useBudgets(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.budgets
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export async function upsertBudget(
  userId: string,
  input: Partial<BudgetRecord> & { id?: string },
) {
  const db = getDB();
  const existing = input.id ? await db.budgets.get(input.id) : null;
  const record: BudgetRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    category: input.category ?? existing?.category ?? "Makan",
    limit: input.limit ?? existing?.limit ?? 0,
    who: input.who ?? existing?.who,
  };
  await sync.recordWrite("budgets", record);
  return record;
}

export async function deleteBudget(userId: string, id: string) {
  await sync.recordDelete("budgets", id, userId);
}

/* ───── Trash / Recently deleted ───── */

const TRASHABLE_TABLES = [
  "transactions",
  "goals",
  "deposits",
  "checklists",
  "moments",
  "skripsiChapters",
  "skripsiBimbingan",
  "deadlines",
  "konten",
  "habits",
  "habitLogs",
  "reflections",
  "recurring",
  "budgets",
] as const;

export interface TrashedItem {
  table: string;
  id: string;
  deletedAt: number;
  preview: string;
  raw: Record<string, unknown>;
}

function previewFor(table: string, r: Record<string, unknown>): string {
  const s = (k: string) => (r[k] != null ? String(r[k]) : "");
  switch (table) {
    case "transactions":
      return `${s("kind") === "in" ? "+" : "−"} ${s("category")} · ${s("date")}`;
    case "goals":
      return `🎯 ${s("name") || s("emoji")}`;
    case "deposits":
      return `💰 setoran ${s("amount")}`;
    case "moments":
      return `💌 ${s("title") || s("date")}`;
    case "skripsiChapters":
      return `🎓 BAB ${s("number")} ${s("title")}`;
    case "skripsiBimbingan":
      return `📝 bimbingan ${s("date")}`;
    case "deadlines":
      return `📌 ${s("title")} · ${s("date")}`;
    case "konten":
      return `🎬 ${s("title")}`;
    case "habits":
      return `✅ habit ${s("label")}`;
    case "reflections":
      return `💭 reflection ${s("date")}`;
    case "recurring":
      return `🔁 ${s("category")} ${s("amount")}`;
    case "budgets":
      return `💵 budget ${s("category")}`;
    default:
      return s("title") || s("name") || s("date") || s("id");
  }
}

export function useTrash(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    const out: TrashedItem[] = [];
    for (const table of TRASHABLE_TABLES) {
      const rows = (await db
        .table(table)
        .where("userId")
        .equals(userId)
        .filter((r: Record<string, unknown>) => !!r.deletedAt)
        .toArray()) as Record<string, unknown>[];
      for (const r of rows) {
        out.push({
          table,
          id: String(r.id),
          deletedAt: Number(r.deletedAt) || 0,
          preview: previewFor(table, r),
          raw: r,
        });
      }
    }
    return out.sort((a, b) => b.deletedAt - a.deletedAt);
  }, [userId]);
}

export async function restoreFromTrash(table: string, id: string) {
  const db = getDB();
  const row = (await db.table(table).get(id)) as
    | (Record<string, unknown> & { deletedAt?: number })
    | undefined;
  if (!row) return;
  const next = { ...row, deletedAt: undefined, updatedAt: now(), dirty: 1 };
  delete (next as Record<string, unknown>).deletedAt;
  await sync.recordWrite(table as never, next as never);
}

export async function purgeFromTrash(table: string, id: string) {
  const db = getDB();
  await db.table(table).delete(id);
}

export async function emptyTrash(userId: string) {
  const db = getDB();
  for (const table of TRASHABLE_TABLES) {
    const rows = await db
      .table(table)
      .where("userId")
      .equals(userId)
      .filter((r: Record<string, unknown>) => !!r.deletedAt)
      .toArray();
    for (const r of rows) await db.table(table).delete((r as { id: string }).id);
  }
}

// ─── Trips (Travel mode) ─────────────────────────────────────────────

export function useTrips(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.trips
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("startDate");
  }, [userId]);
}

export async function upsertTrip(
  userId: string,
  input: {
    id?: string;
    destination: string;
    emoji?: string;
    startDate: string;
    endDate: string;
    budget: number;
    note?: string;
    packing?: string;
  },
): Promise<TripRecord> {
  const db = getDB();
  const existing = input.id ? await db.trips.get(input.id) : null;
  const slug = input.destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  const tag = existing?.tag ?? `trip:${slug || "trip"}${Date.now().toString(36).slice(-3)}`;
  const record: TripRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    destination: input.destination,
    emoji: input.emoji ?? existing?.emoji ?? "✈️",
    startDate: input.startDate,
    endDate: input.endDate,
    budget: input.budget,
    tag,
    note: input.note ?? existing?.note,
    packing: input.packing ?? existing?.packing,
  };
  await sync.recordWrite("trips", record);
  return record;
}

export async function deleteTrip(userId: string, id: string) {
  await sync.recordDelete("trips", id, userId);
}

// ─── Recurring goals (auto-deposit) ──────────────────────────────────

export function useRecurringGoals(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.recurringGoals
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId]);
}

export async function upsertRecurringGoal(
  userId: string,
  input: {
    id?: string;
    goalId: string;
    amount: number;
    who: string;
    dayOfMonth: number;
    nextDue?: string;
    active?: boolean;
  },
): Promise<RecurringGoalRecord> {
  const db = getDB();
  const existing = input.id ? await db.recurringGoals.get(input.id) : null;
  const record: RecurringGoalRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    goalId: input.goalId,
    amount: input.amount,
    who: input.who,
    dayOfMonth: Math.max(1, Math.min(28, input.dayOfMonth)),
    nextDue: input.nextDue ?? existing?.nextDue ?? new Date().toISOString().slice(0, 10),
    active: input.active === false ? 0 : 1,
  };
  await sync.recordWrite("recurringGoals", record);
  return record;
}

export async function deleteRecurringGoal(userId: string, id: string) {
  await sync.recordDelete("recurringGoals", id, userId);
}

/* ───── Generic Entries (water/weight/mood/sleep/exercise/journal/etc) ───── */

export function useEntries(userId: string | null, kind: string) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.entries
      .where("[userId+kind]")
      .equals([userId, kind])
      .filter((r) => !r.deletedAt)
      .reverse()
      .sortBy("date");
  }, [userId, kind]);
}

export async function upsertEntry(
  userId: string,
  input: Partial<EntryRecord> & { id?: string; kind: string; date: string },
): Promise<EntryRecord> {
  const db = getDB();
  const existing = input.id ? await db.entries.get(input.id) : null;
  const record: EntryRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    kind: input.kind,
    date: input.date,
    valueNum: input.valueNum,
    valueText: input.valueText,
    who: input.who,
    tags: input.tags,
    payload: input.payload,
  };
  await sync.recordWrite("entries", record);
  return record;
}

export async function deleteEntry(userId: string, id: string) {
  await sync.recordDelete("entries", id, userId);
}

/* ───── Generic Items (anniversaries/wishlist/meds/pets/etc) ───── */

export function useItems(userId: string | null, kind: string) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const db = getDB();
    return db.items
      .where("[userId+kind]")
      .equals([userId, kind])
      .filter((r) => !r.deletedAt)
      .toArray();
  }, [userId, kind]);
}

export async function upsertItem(
  userId: string,
  input: Partial<ItemRecord> & { id?: string; kind: string; title: string },
): Promise<ItemRecord> {
  const db = getDB();
  const existing = input.id ? await db.items.get(input.id) : null;
  const record: ItemRecord = {
    id: input.id ?? newId(),
    userId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    dirty: 1,
    kind: input.kind,
    title: input.title,
    status: input.status,
    date: input.date,
    due: input.due,
    amount: input.amount,
    who: input.who,
    tags: input.tags,
    payload: input.payload,
  };
  await sync.recordWrite("items", record);
  return record;
}

export async function deleteItem(userId: string, id: string) {
  await sync.recordDelete("items", id, userId);
}
