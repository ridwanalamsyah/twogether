import {
  getDB,
  newId,
  now,
  type DepositRecord,
  type RecurringGoalRecord,
  type RecurringRecord,
  type TransactionRecord,
} from "@/lib/db";
import { sync } from "@/services/sync";

/**
 * Iterate all active recurring templates and, if their nextDue date is
 * today-or-past, insert a TransactionRecord for each occurrence and advance
 * nextDue until it's strictly in the future. Idempotent per run.
 */
export async function applyRecurring(userId: string): Promise<number> {
  if (typeof window === "undefined") return 0;
  const db = getDB();
  const templates = await db.recurring
    .where("userId")
    .equals(userId)
    .filter((r: RecurringRecord) => !r.deletedAt && r.active === 1)
    .toArray();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let created = 0;

  for (const t of templates) {
    let due = new Date(t.nextDue);
    while (due.getTime() <= today.getTime()) {
      const iso = due.toISOString().slice(0, 10);
      const tx: TransactionRecord = {
        id: newId(),
        userId,
        createdAt: now(),
        updatedAt: now(),
        dirty: 1,
        kind: t.kind,
        amount: t.amount,
        category: t.category,
        who: t.who,
        note: t.note ? `${t.note} · auto` : "Auto (recurring)",
        date: iso,
      };
      await sync.recordWrite("transactions", tx);
      created += 1;
      due = advance(due, t);
    }
    if (due.toISOString().slice(0, 10) !== t.nextDue) {
      await sync.recordWrite("recurring", {
        ...t,
        nextDue: due.toISOString().slice(0, 10),
        updatedAt: now(),
        dirty: 1,
      });
    }
  }
  return created;
}

function advance(d: Date, t: RecurringRecord): Date {
  const next = new Date(d);
  if (t.interval === "daily") next.setDate(next.getDate() + 1);
  else if (t.interval === "weekly") next.setDate(next.getDate() + 7);
  else {
    next.setMonth(next.getMonth() + 1);
    if (t.dayOfMonth && t.dayOfMonth >= 1 && t.dayOfMonth <= 28) {
      next.setDate(t.dayOfMonth);
    }
  }
  return next;
}

/**
 * Apply recurring goals — like applyRecurring, but inserts a DepositRecord
 * against the linked goal. Useful for "tabung 1jt tiap bulan" automation.
 */
export async function applyRecurringGoals(userId: string): Promise<number> {
  if (typeof window === "undefined") return 0;
  const db = getDB();
  const templates = await db.recurringGoals
    .where("userId")
    .equals(userId)
    .filter((r: RecurringGoalRecord) => !r.deletedAt && r.active === 1)
    .toArray();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let created = 0;

  for (const t of templates) {
    let due = new Date(t.nextDue);
    while (due.getTime() <= today.getTime()) {
      const iso = due.toISOString().slice(0, 10);
      const dep: DepositRecord = {
        id: newId(),
        userId,
        createdAt: now(),
        updatedAt: now(),
        dirty: 1,
        goalId: t.goalId,
        amount: t.amount,
        who: t.who,
        note: "Auto (recurring goal)",
        date: iso,
      };
      await sync.recordWrite("deposits", dep);
      created += 1;
      due = advanceMonth(due, t.dayOfMonth);
    }
    if (due.toISOString().slice(0, 10) !== t.nextDue) {
      await sync.recordWrite("recurringGoals", {
        ...t,
        nextDue: due.toISOString().slice(0, 10),
        updatedAt: now(),
        dirty: 1,
      });
    }
  }
  return created;
}

function advanceMonth(d: Date, dayOfMonth: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  if (dayOfMonth >= 1 && dayOfMonth <= 28) next.setDate(dayOfMonth);
  return next;
}
