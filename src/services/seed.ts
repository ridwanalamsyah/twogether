import { getDB, newId, now, type BaseRecord, type GoalRecord, type SkripsiChapterRecord, type HabitRecord, type ChecklistRecord, type TransactionRecord, type SkripsiMetaRecord } from "@/lib/db";
import { sync } from "@/services/sync";
import { DEFAULT_SKRIPSI_CHAPTERS } from "@/stores/data";

/**
 * Seed sample data so a brand-new account looks like the prototype
 * (`bareng-v2.html`) instead of an empty shell.
 *
 * Idempotent: checks existing counts and skips sections that already have
 * data so re-calling on bootstrap is safe.
 */

interface SeedOptions {
  userId: string;
  primaryWho: string;
  secondaryWho?: string;
}

const SAMPLE_GOALS: { name: string; target: number; category: GoalRecord["category"]; emoji: string; deadline?: string }[] = [
  { name: "Modal Usaha", target: 9_000_000, category: "modal", emoji: "🚀" },
  { name: "Dana Nikah", target: 30_000_000, category: "savings", emoji: "💍" },
  { name: "Traveling Bareng", target: 5_000_000, category: "travel", emoji: "✈️" },
];

const SAMPLE_HABITS: Omit<HabitRecord, keyof BaseRecord>[] = [
  { label: "Subuh + dzikir pagi", bucket: "Pagi" },
  { label: "Olahraga 15–30 menit", bucket: "Pagi" },
  { label: "Catat pengeluaran hari ini", bucket: "Siang" },
  { label: "1 task usaha / skripsi", bucket: "Siang" },
  { label: "Minum 8 gelas air", bucket: "Seharian" },
  { label: "Sholat 5 waktu lengkap", bucket: "Seharian" },
  { label: "Tidak jebol budget", bucket: "Sore" },
  { label: "Check-in sama pasangan", bucket: "Malam" },
  { label: "Tidur sebelum jam 22.00", bucket: "Malam" },
];

const SAMPLE_CHECKLISTS: string[] = [
  "Senin: tulis 3 prioritas minggu ini",
  "Rabu: deep work usaha 3-4 jam",
  "Kamis: transfer tabungan 3 tujuan",
  "Jumat: posting konten halal",
  "Jumat: review keuangan berdua",
];

const SAMPLE_TRANSACTIONS: { dayOffset: number; kind: "in" | "out"; amount: number; category: string; note: string; whoIdx: 0 | 1 }[] = [
  { dayOffset: 0, kind: "out", amount: 35_000, category: "Makan", note: "Ayam geprek + es teh", whoIdx: 0 },
  { dayOffset: 0, kind: "out", amount: 15_000, category: "Bensin", note: "Isi motor", whoIdx: 0 },
  { dayOffset: 1, kind: "out", amount: 120_000, category: "Laundry", note: "Laundry mingguan", whoIdx: 1 },
  { dayOffset: 1, kind: "in", amount: 2_500_000, category: "Usaha", note: "Transfer ordere minggu ini", whoIdx: 1 },
  { dayOffset: 2, kind: "out", amount: 25_000, category: "Jajan", note: "Kopi + roti", whoIdx: 0 },
  { dayOffset: 2, kind: "out", amount: 180_000, category: "Skincare", note: "Serum + toner", whoIdx: 1 },
  { dayOffset: 3, kind: "out", amount: 50_000, category: "Kuliah", note: "Print + jilid proposal", whoIdx: 0 },
  { dayOffset: 4, kind: "in", amount: 1_500_000, category: "Ortu", note: "Transfer orang tua", whoIdx: 0 },
  { dayOffset: 4, kind: "out", amount: 240_000, category: "Makan", note: "Makan bareng (patungan)", whoIdx: 0 },
  { dayOffset: 5, kind: "out", amount: 22_000, category: "Bensin", note: "Isi motor", whoIdx: 1 },
  { dayOffset: 6, kind: "out", amount: 75_000, category: "Jajan", note: "Nonton weekend", whoIdx: 0 },
];

function daysAgoISO(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
}

async function ensureCountZero(
  table: "goals" | "skripsiChapters" | "habits" | "checklists" | "transactions" | "skripsiMeta",
  userId: string,
): Promise<boolean> {
  const db = getDB();
  const n = await db.table(table).where("userId").equals(userId).count();
  return n === 0;
}

export async function seedSampleData(opts: SeedOptions): Promise<void> {
  const { userId, primaryWho, secondaryWho } = opts;

  if (await ensureCountZero("goals", userId)) {
    for (const g of SAMPLE_GOALS) {
      const record: GoalRecord = {
        id: newId(),
        userId,
        createdAt: now(),
        updatedAt: now(),
        dirty: 1,
        name: g.name,
        target: g.target,
        category: g.category,
        emoji: g.emoji,
        deadline: g.deadline,
      };
      await sync.recordWrite("goals", record);
    }
  }

  if (await ensureCountZero("skripsiChapters", userId)) {
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

  if (await ensureCountZero("skripsiMeta", userId)) {
    const record: SkripsiMetaRecord = {
      id: newId(),
      userId,
      createdAt: now(),
      updatedAt: now(),
      dirty: 1,
      judul: "",
      dosen: "",
      target: "",
    };
    await sync.recordWrite("skripsiMeta", record);
  }

  if (await ensureCountZero("habits", userId)) {
    for (const h of SAMPLE_HABITS) {
      const record: HabitRecord = {
        id: newId(),
        userId,
        createdAt: now(),
        updatedAt: now(),
        dirty: 1,
        ...h,
      };
      await sync.recordWrite("habits", record);
    }
  }

  if (await ensureCountZero("checklists", userId)) {
    const today = daysAgoISO(0);
    for (const title of SAMPLE_CHECKLISTS) {
      const record: ChecklistRecord = {
        id: newId(),
        userId,
        createdAt: now(),
        updatedAt: now(),
        dirty: 1,
        title,
        done: 0,
        date: today,
      };
      await sync.recordWrite("checklists", record);
    }
  }

  if (await ensureCountZero("transactions", userId)) {
    const names = [primaryWho, secondaryWho ?? primaryWho] as const;
    for (const tx of SAMPLE_TRANSACTIONS) {
      const record: TransactionRecord = {
        id: newId(),
        userId,
        createdAt: now(),
        updatedAt: now(),
        dirty: 1,
        kind: tx.kind,
        amount: tx.amount,
        category: tx.category,
        who: names[tx.whoIdx],
        note: tx.note,
        date: daysAgoISO(tx.dayOffset),
      };
      await sync.recordWrite("transactions", record);
    }
  }
}
