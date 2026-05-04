/**
 * Streak + badge engine.
 *
 * Streaks: count consecutive days an action of a given kind occurred.
 * Badges: one-time milestones, criteria evaluated against entries/items/transactions/deposits.
 */
import { getDB } from "@/lib/db";

export type BadgeId = string;

export interface BadgeDef {
  id: BadgeId;
  title: string;
  description: string;
  category: "Belajar" | "Sehat" | "Uang" | "Kita" | "Disiplin";
  /** Returns >0 progress fraction toward unlock (0–1). 1 means unlocked. */
  check: (data: AggData) => number;
}

export interface AggData {
  entriesByKind: Map<string, { date: string; valueNum?: number }[]>;
  itemsByKind: Map<string, { date?: string; status?: string; amount?: number; who?: string }[]>;
  totalDeposits: number; // sum of all deposits
  totalIncome: number;
  totalExpense: number;
  goalCount: number;
  goalsCompleted: number; // goals where deposits >= target
}

/* ───── Streak helpers ───── */

export function calcStreak(entriesDates: string[]): { current: number; best: number } {
  if (entriesDates.length === 0) return { current: 0, best: 0 };
  const set = new Set(entriesDates);
  // Best run
  const sorted = [...set].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else if (diff > 1) {
      run = 1;
    }
  }
  // Current = consecutive days ending today or yesterday
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);
  let cursor: Date;
  if (set.has(todayISO)) {
    cursor = today;
  } else if (set.has(yesterdayISO)) {
    cursor = yesterday;
  } else {
    return { current: 0, best };
  }
  let current = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, best };
}

/* ───── Aggregation: collect all data for a userId ───── */

export async function aggregateForUser(userId: string): Promise<AggData> {
  const db = getDB();
  const [entries, items, txs, deposits, goals] = await Promise.all([
    db.entries.where("userId").equals(userId).filter((r) => !r.deletedAt).toArray(),
    db.items.where("userId").equals(userId).filter((r) => !r.deletedAt).toArray(),
    db.transactions.where("userId").equals(userId).filter((r) => !r.deletedAt).toArray(),
    db.deposits.where("userId").equals(userId).filter((r) => !r.deletedAt).toArray(),
    db.goals.where("userId").equals(userId).filter((r) => !r.deletedAt).toArray(),
  ]);

  const entriesByKind = new Map<string, { date: string; valueNum?: number }[]>();
  for (const e of entries) {
    const arr = entriesByKind.get(e.kind) ?? [];
    arr.push({ date: e.date, valueNum: e.valueNum });
    entriesByKind.set(e.kind, arr);
  }

  const itemsByKind = new Map<
    string,
    { date?: string; status?: string; amount?: number; who?: string }[]
  >();
  for (const it of items) {
    const arr = itemsByKind.get(it.kind) ?? [];
    arr.push({ date: it.date, status: it.status, amount: it.amount, who: it.who });
    itemsByKind.set(it.kind, arr);
  }

  const totalDeposits = deposits.reduce((s, d) => s + (d.amount ?? 0), 0);
  const totalIncome = txs.filter((t) => t.kind === "in").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.kind === "out").reduce((s, t) => s + t.amount, 0);

  const goalsCompleted = goals.filter((g) => {
    const sum = deposits.filter((d) => d.goalId === g.id).reduce((s, d) => s + d.amount, 0);
    return sum >= g.target;
  }).length;

  return {
    entriesByKind,
    itemsByKind,
    totalDeposits,
    totalIncome,
    totalExpense,
    goalCount: goals.length,
    goalsCompleted,
  };
}

/* ───── Badge catalog ───── */

const dayCount = (entries: { date: string }[] | undefined) =>
  new Set((entries ?? []).map((e) => e.date)).size;

export const BADGES: BadgeDef[] = [
  // Belajar
  {
    id: "pomodoro_first",
    title: "Pomodoro pertama",
    description: "Selesai sesi pomodoro pertamamu",
    category: "Belajar",
    check: (d) => Math.min(1, (d.entriesByKind.get("pomodoro")?.length ?? 0) / 1),
  },
  {
    id: "pomodoro_10",
    title: "10 sesi pomodoro",
    description: "Total 10 sesi pomodoro selesai",
    category: "Belajar",
    check: (d) => Math.min(1, (d.entriesByKind.get("pomodoro")?.length ?? 0) / 10),
  },
  {
    id: "pomodoro_50",
    title: "50 sesi pomodoro",
    description: "Total 50 sesi pomodoro — fokus master",
    category: "Belajar",
    check: (d) => Math.min(1, (d.entriesByKind.get("pomodoro")?.length ?? 0) / 50),
  },
  {
    id: "journal_first",
    title: "Mulai jurnal",
    description: "Catat jurnal pertamamu",
    category: "Belajar",
    check: (d) => Math.min(1, (d.entriesByKind.get("journal")?.length ?? 0) / 1),
  },
  {
    id: "journal_30day",
    title: "Jurnal 30 hari",
    description: "Jurnal di 30 hari berbeda",
    category: "Belajar",
    check: (d) => Math.min(1, dayCount(d.entriesByKind.get("journal")) / 30),
  },
  {
    id: "reading_5",
    title: "5 buku selesai",
    description: "Tandai 5 buku sebagai selesai dibaca",
    category: "Belajar",
    check: (d) =>
      Math.min(
        1,
        (d.itemsByKind.get("book")?.filter((i) => i.status === "done").length ?? 0) / 5,
      ),
  },

  // Sehat
  {
    id: "water_first",
    title: "Glug pertama",
    description: "Catat 1 gelas air pertama",
    category: "Sehat",
    check: (d) => Math.min(1, (d.entriesByKind.get("water")?.length ?? 0) / 1),
  },
  {
    id: "water_7day",
    title: "Air 7 hari",
    description: "Catat air minum 7 hari berturut-turut",
    category: "Sehat",
    check: (d) => {
      const dates = (d.entriesByKind.get("water") ?? []).map((e) => e.date);
      return Math.min(1, calcStreak(dates).current / 7);
    },
  },
  {
    id: "water_30day",
    title: "Air 30 hari",
    description: "Streak 30 hari minum air",
    category: "Sehat",
    check: (d) => {
      const dates = (d.entriesByKind.get("water") ?? []).map((e) => e.date);
      return Math.min(1, calcStreak(dates).best / 30);
    },
  },
  {
    id: "exercise_5",
    title: "5 sesi olahraga",
    description: "5 sesi olahraga tercatat",
    category: "Sehat",
    check: (d) => Math.min(1, (d.entriesByKind.get("exercise")?.length ?? 0) / 5),
  },
  {
    id: "exercise_streak_3",
    title: "Olahraga 3 hari beruntun",
    description: "Streak olahraga 3 hari",
    category: "Sehat",
    check: (d) => {
      const dates = (d.entriesByKind.get("exercise") ?? []).map((e) => e.date);
      return Math.min(1, calcStreak(dates).best / 3);
    },
  },
  {
    id: "mood_30day",
    title: "Mood diary konsisten",
    description: "Catat mood di 30 hari berbeda",
    category: "Sehat",
    check: (d) => Math.min(1, dayCount(d.entriesByKind.get("mood")) / 30),
  },
  {
    id: "weight_log",
    title: "Mulai timbang",
    description: "Catat berat pertama",
    category: "Sehat",
    check: (d) => Math.min(1, (d.entriesByKind.get("weight")?.length ?? 0) / 1),
  },
  {
    id: "sleep_7day",
    title: "Tidur tertib",
    description: "Catat tidur 7 hari berbeda",
    category: "Sehat",
    check: (d) => Math.min(1, dayCount(d.entriesByKind.get("sleep")) / 7),
  },

  // Uang
  {
    id: "deposit_first",
    title: "Setoran pertama",
    description: "Tabung pertama kali ke goal",
    category: "Uang",
    check: (d) => (d.totalDeposits > 0 ? 1 : 0),
  },
  {
    id: "deposit_1jt",
    title: "Total tabungan 1jt",
    description: "Total setoran tembus Rp 1.000.000",
    category: "Uang",
    check: (d) => Math.min(1, d.totalDeposits / 1_000_000),
  },
  {
    id: "deposit_10jt",
    title: "Total tabungan 10jt",
    description: "Total setoran tembus Rp 10.000.000",
    category: "Uang",
    check: (d) => Math.min(1, d.totalDeposits / 10_000_000),
  },
  {
    id: "goal_complete_first",
    title: "Goal pertama tercapai",
    description: "Selesaikan satu goal sampai 100%",
    category: "Uang",
    check: (d) => (d.goalsCompleted > 0 ? 1 : 0),
  },
  {
    id: "goal_complete_3",
    title: "3 goal tercapai",
    description: "Selesai 3 goal",
    category: "Uang",
    check: (d) => Math.min(1, d.goalsCompleted / 3),
  },
  {
    id: "subscription_audit",
    title: "Audit langganan",
    description: "Catat 3 langganan untuk review",
    category: "Uang",
    check: (d) => Math.min(1, (d.itemsByKind.get("subscription")?.length ?? 0) / 3),
  },
  {
    id: "debt_settled",
    title: "Hutang lunas",
    description: "Tandai 1 hutang sebagai lunas",
    category: "Uang",
    check: (d) =>
      (d.itemsByKind.get("debt")?.filter((i) => i.status === "settled").length ?? 0) > 0 ? 1 : 0,
  },

  // Kita
  {
    id: "anniversary_log",
    title: "Tanggal penting tercatat",
    description: "Simpan 1 tanggal penting",
    category: "Kita",
    check: (d) => Math.min(1, (d.itemsByKind.get("anniv")?.length ?? 0) / 1),
  },
  {
    id: "appreciation_5",
    title: "5 apresiasi",
    description: "Tulis 5 catatan apresiasi",
    category: "Kita",
    check: (d) => Math.min(1, (d.entriesByKind.get("apresiasi")?.length ?? 0) / 5),
  },
  {
    id: "datenight_done",
    title: "Date night dijalanin",
    description: "1 ide date night ditandai sudah",
    category: "Kita",
    check: (d) =>
      (d.itemsByKind.get("datenight")?.filter((i) => i.status === "done").length ?? 0) > 0
        ? 1
        : 0,
  },
  {
    id: "bucket_done",
    title: "Bucket list tercoret",
    description: "1 item bucket list selesai",
    category: "Kita",
    check: (d) =>
      (d.itemsByKind.get("bucket")?.filter((i) => i.status === "done").length ?? 0) > 0 ? 1 : 0,
  },

  // Disiplin (cross-cutting streaks)
  {
    id: "early_bird",
    title: "Konsisten 7 hari",
    description: "Aktif (jurnal/pomodoro/air/olahraga) 7 hari beruntun",
    category: "Disiplin",
    check: (d) => {
      const all: string[] = [];
      for (const k of ["water", "pomodoro", "journal", "exercise", "mood"]) {
        for (const e of d.entriesByKind.get(k) ?? []) all.push(e.date);
      }
      return Math.min(1, calcStreak(all).current / 7);
    },
  },
  {
    id: "consistent_30",
    title: "Konsisten sebulan",
    description: "Aktif 30 hari beruntun",
    category: "Disiplin",
    check: (d) => {
      const all: string[] = [];
      for (const k of ["water", "pomodoro", "journal", "exercise", "mood"]) {
        for (const e of d.entriesByKind.get(k) ?? []) all.push(e.date);
      }
      return Math.min(1, calcStreak(all).best / 30);
    },
  },
];

/* ───── Streak summary table ───── */

export interface StreakRow {
  kind: string;
  label: string;
  current: number;
  best: number;
  total: number;
}

const STREAK_KINDS: { kind: string; label: string }[] = [
  { kind: "pomodoro", label: "Pomodoro" },
  { kind: "water", label: "Air minum" },
  { kind: "exercise", label: "Olahraga" },
  { kind: "journal", label: "Jurnal" },
  { kind: "mood", label: "Mood" },
];

export function buildStreakTable(d: AggData): StreakRow[] {
  return STREAK_KINDS.map(({ kind, label }) => {
    const entries = d.entriesByKind.get(kind) ?? [];
    const dates = entries.map((e) => e.date);
    const { current, best } = calcStreak(dates);
    return { kind, label, current, best, total: entries.length };
  });
}
