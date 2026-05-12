import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getDB } from "@/lib/db";
import {
  exportAll,
  exportGoalsCsv,
  exportMomentsCsv,
  exportTransactionsCsv,
} from "@/services/privacy";

const USER_ID = "user_test_priv";

async function seedTransactions() {
  const db = getDB();
  await db.transactions.bulkPut([
    {
      id: "tx_1",
      userId: USER_ID,
      kind: "in",
      amount: 50000,
      category: "Gaji",
      who: "Spartan",
      note: "test, with comma",
      date: "2026-05-01",
      createdAt: 1,
      updatedAt: 1,
      dirty: 0,
    },
    {
      id: "tx_2",
      userId: USER_ID,
      kind: "out",
      amount: 12500,
      category: "Makan",
      who: "Spartan",
      date: "2026-05-02",
      createdAt: 2,
      updatedAt: 2,
      dirty: 0,
    },
    {
      id: "tx_deleted",
      userId: USER_ID,
      kind: "out",
      amount: 999,
      category: "x",
      who: "y",
      date: "2026-04-01",
      createdAt: 0,
      updatedAt: 0,
      dirty: 1,
      deletedAt: 100,
    },
    {
      id: "tx_other_user",
      userId: "other_user",
      kind: "in",
      amount: 1,
      category: "x",
      who: "y",
      date: "2026-01-01",
      createdAt: 0,
      updatedAt: 0,
      dirty: 1,
    },
  ]);
}

async function seedGoalsAndDeposits() {
  const db = getDB();
  await db.goals.bulkPut([
    {
      id: "g_1",
      userId: USER_ID,
      name: "Liburan Bali",
      target: 5_000_000,
      category: "travel",
      deadline: "2026-12-31",
      createdAt: 1,
      updatedAt: 1,
      dirty: 0,
    },
    {
      id: "g_2",
      userId: USER_ID,
      name: "Dana darurat",
      target: 0,
      category: "savings",
      createdAt: 2,
      updatedAt: 2,
      dirty: 0,
    },
  ]);
  await db.deposits.bulkPut([
    {
      id: "d_1",
      userId: USER_ID,
      goalId: "g_1",
      amount: 1_000_000,
      who: "S",
      date: "2026-05-01",
      createdAt: 0,
      updatedAt: 0,
      dirty: 0,
    },
    {
      id: "d_2",
      userId: USER_ID,
      goalId: "g_1",
      amount: 500_000,
      who: "S",
      date: "2026-05-02",
      createdAt: 0,
      updatedAt: 0,
      dirty: 0,
    },
  ]);
}

async function seedMoments() {
  const db = getDB();
  await db.moments.bulkPut([
    {
      id: "m_plain",
      userId: USER_ID,
      title: "First date",
      body: "Sunset di Bali, romantis",
      encrypted: 0,
      date: "2026-04-01",
      emoji: "❤️",
      tags: ["love", "bali"],
      createdAt: 0,
      updatedAt: 0,
      dirty: 0,
    },
    {
      id: "m_encrypted",
      userId: USER_ID,
      title: "Secret",
      body: "<should-not-leak>",
      cipher: "base64ciphertext",
      encrypted: 1,
      date: "2026-04-02",
      createdAt: 0,
      updatedAt: 0,
      dirty: 0,
    },
  ]);
}

beforeEach(async () => {
  // happy-dom + fake-indexeddb gives us a fresh database per test file,
  // but tables may carry state across tests inside the file. Clear them.
  const db = getDB();
  await Promise.all([
    db.transactions.clear(),
    db.goals.clear(),
    db.deposits.clear(),
    db.moments.clear(),
  ]);
});

afterEach(async () => {
  const db = getDB();
  await Promise.all([
    db.transactions.clear(),
    db.goals.clear(),
    db.deposits.clear(),
    db.moments.clear(),
  ]);
});

describe("exportTransactionsCsv", () => {
  it("excludes tombstoned + other-user rows; quotes commas correctly", async () => {
    await seedTransactions();
    const csv = await exportTransactionsCsv(USER_ID);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("date,kind,amount,category,who,note");
    expect(lines).toHaveLength(3);
    // RFC4180-ish: cell with a comma is quoted.
    expect(csv).toContain('"test, with comma"');
    expect(csv).not.toContain("tx_deleted");
    expect(csv).not.toContain("tx_other_user");
    expect(csv).toContain("Gaji");
    expect(csv).toContain("Makan");
  });
});

describe("exportGoalsCsv", () => {
  it("aggregates deposits into a saved column and computes progress", async () => {
    await seedGoalsAndDeposits();
    const csv = await exportGoalsCsv(USER_ID);
    const lines = csv.split("\n");

    expect(lines[0]).toBe(
      "id,name,category,target,saved,progress_pct,deadline",
    );
    expect(lines).toHaveLength(3);

    const bali = lines.find((l) => l.startsWith("g_1"))!;
    const darurat = lines.find((l) => l.startsWith("g_2"))!;
    expect(bali).toContain("1500000"); // 1M + 500K
    expect(bali).toContain("30"); // 1.5M / 5M = 30%
    expect(bali).toContain("2026-12-31");

    // target=0 must not divide-by-zero; pct should be 0
    expect(darurat).toContain(",0,0,0,"); // target=0, saved=0, pct=0
  });
});

describe("exportMomentsCsv", () => {
  it("blanks out body for encrypted entries but still exports metadata", async () => {
    await seedMoments();
    const csv = await exportMomentsCsv(USER_ID);

    expect(csv).toContain("First date");
    expect(csv).toContain("Sunset di Bali, romantis");
    // Encrypted body MUST NOT leak.
    expect(csv).not.toContain("<should-not-leak>");
    expect(csv).toContain("[ENCRYPTED");
    expect(csv).toContain("Secret");
    expect(csv).toContain("love;bali"); // tags joined with ;
  });
});

describe("exportAll", () => {
  it("returns a bundle with all seeded records and excludes other users", async () => {
    await seedTransactions();
    await seedGoalsAndDeposits();
    await seedMoments();

    const bundle = await exportAll(USER_ID);

    expect(bundle.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    // 4 transactions total seeded — but other-user one is filtered; tombstoned
    // is included (so a future restore preserves the tombstone).
    expect(bundle.records.transactions).toHaveLength(3);
    expect(bundle.records.goals).toHaveLength(2);
    expect(bundle.records.deposits).toHaveLength(2);
    expect(bundle.records.moments).toHaveLength(2);
    expect(bundle.meta.recordCount).toBeGreaterThan(0);
  });
});
