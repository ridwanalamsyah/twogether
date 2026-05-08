import { getDB, newId, now, type BaseRecord, type GoalRecord, type SkripsiChapterRecord, type HabitRecord, type ChecklistRecord, type TransactionRecord, type SkripsiMetaRecord, type EntryRecord, type ItemRecord } from "@/lib/db";
import { sync } from "@/services/sync";
import { DEFAULT_SKRIPSI_CHAPTERS } from "@/stores/data";
import { SEMESTER_6_SCHEDULE } from "@/data/classes";

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
  "Jumat: review keuangan + goal mingguan",
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
  table:
    | "goals"
    | "skripsiChapters"
    | "habits"
    | "checklists"
    | "transactions"
    | "skripsiMeta"
    | "entries"
    | "items",
  userId: string,
): Promise<boolean> {
  const db = getDB();
  const n = await db.table(table).where("userId").equals(userId).count();
  return n === 0;
}

async function ensureKindCountZero(
  table: "entries" | "items",
  userId: string,
  kind: string,
): Promise<boolean> {
  const db = getDB();
  const n = await db
    .table(table)
    .where("[userId+kind]")
    .equals([userId, kind])
    .count();
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

  // ───── Tracker seeds (entries) ─────
  const names = [primaryWho, secondaryWho ?? primaryWho] as const;
  const writeEntry = async (
    kind: string,
    payload: Omit<EntryRecord, keyof BaseRecord | "kind">,
  ) => {
    const record: EntryRecord = {
      id: newId(),
      userId,
      createdAt: now(),
      updatedAt: now(),
      dirty: 1,
      kind,
      ...payload,
    };
    await sync.recordWrite("entries", record);
  };
  const writeItem = async (
    kind: string,
    payload: Omit<ItemRecord, keyof BaseRecord | "kind">,
  ) => {
    const record: ItemRecord = {
      id: newId(),
      userId,
      createdAt: now(),
      updatedAt: now(),
      dirty: 1,
      kind,
      ...payload,
    };
    await sync.recordWrite("items", record);
  };

  // Air minum 7 hari terakhir (3-7 gelas/hari)
  if (await ensureKindCountZero("entries", userId, "water")) {
    for (let d = 0; d < 7; d++) {
      const cups = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < cups; i++) {
        await writeEntry("water", {
          date: daysAgoISO(d),
          valueNum: 1,
          who: names[d % 2],
        });
      }
    }
  }
  // Mood
  if (await ensureKindCountZero("entries", userId, "mood")) {
    const moods = [4, 5, 3, 4, 5, 4, 5];
    for (let d = 0; d < moods.length; d++) {
      await writeEntry("mood", {
        date: daysAgoISO(d),
        valueNum: moods[d],
        who: names[0],
      });
    }
  }
  // Berat
  if (await ensureKindCountZero("entries", userId, "weight")) {
    for (let d = 0; d < 7; d++) {
      await writeEntry("weight", {
        date: daysAgoISO(d * 2),
        valueNum: 55 + Math.random() * 0.8,
        who: names[0],
      });
    }
  }
  // Sleep
  if (await ensureKindCountZero("entries", userId, "sleep")) {
    for (let d = 0; d < 7; d++) {
      await writeEntry("sleep", {
        date: daysAgoISO(d),
        valueNum: 6 + Math.random() * 2,
        who: names[d % 2],
      });
    }
  }
  // Olahraga
  if (await ensureKindCountZero("entries", userId, "exercise")) {
    await writeEntry("exercise", {
      date: daysAgoISO(0),
      valueNum: 30,
      valueText: "Jogging",
      who: names[0],
    });
    await writeEntry("exercise", {
      date: daysAgoISO(2),
      valueNum: 20,
      valueText: "Yoga",
      who: names[1],
    });
  }
  // Apresiasi pasangan
  if (await ensureKindCountZero("entries", userId, "apresiasi")) {
    await writeEntry("apresiasi", {
      date: daysAgoISO(0),
      valueText: "Bantu masakin sarapan walaupun cape banget 🥹",
      who: names[0],
    });
    await writeEntry("apresiasi", {
      date: daysAgoISO(3),
      valueText: "Selalu kasih semangat waktu bingung skripsi",
      who: names[1],
    });
  }

  // ───── Tracker seeds (items) ─────
  if (await ensureKindCountZero("items", userId, "anniv")) {
    await writeItem("anniv", {
      title: "Jadian-versary",
      date: "2024-02-14",
      due: "2026-02-14",
      who: "Bareng",
    });
    await writeItem("anniv", {
      title: "Ulang tahun pasangan",
      date: "1999-08-17",
      due: "2026-08-17",
      who: names[1],
    });
  }
  if (await ensureKindCountZero("items", userId, "datenight")) {
    await writeItem("datenight", {
      title: "Coba kafe baru di Dago",
      status: "ide",
      who: "Bareng",
    });
    await writeItem("datenight", {
      title: "Movie marathon di rumah",
      status: "selesai",
      date: daysAgoISO(14),
      who: "Bareng",
    });
  }
  if (await ensureKindCountZero("items", userId, "wishlist")) {
    await writeItem("wishlist", {
      title: "iPhone 17 Pro",
      amount: 25_000_000,
      status: "wishlist",
    });
    await writeItem("wishlist", {
      title: "Sepatu lari Hoka",
      amount: 2_500_000,
      status: "wishlist",
    });
  }
  if (await ensureKindCountZero("items", userId, "subscription")) {
    await writeItem("subscription", {
      title: "Netflix",
      amount: 65_000,
      due: "2026-05-10",
      payload: JSON.stringify({ period: "monthly" }),
    });
    await writeItem("subscription", {
      title: "Spotify Premium",
      amount: 54_000,
      due: "2026-05-15",
      payload: JSON.stringify({ period: "monthly" }),
    });
  }

  // Jadwal kuliah Semester 6 — auto-insert kalau belum pernah
  if (await ensureKindCountZero("items", userId, "class")) {
    for (const c of SEMESTER_6_SCHEDULE) {
      await writeItem("class", {
        title: c.title,
        who: c.lecturer,
        tags: [c.day, c.start, c.end, c.room ?? "", c.pj ?? "", c.cp ?? ""].filter(
          Boolean,
        ),
        payload: JSON.stringify(c),
      });
    }
  }
}
