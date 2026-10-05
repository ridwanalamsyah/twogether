import { getDB, type BudgetRecord, type TransactionRecord } from "@/lib/db";
import { formatRupiahShort } from "@/lib/utils";

export interface BudgetUsage {
  budget: BudgetRecord;
  spent: number;
  /** 0..∞ (1 = exactly at the limit). */
  ratio: number;
  level: "ok" | "warn" | "over";
}

export const WARN_AT = 0.8;

const levelOf = (r: number): BudgetUsage["level"] => (r >= 1 ? "over" : r >= WARN_AT ? "warn" : "ok");

/** Spending against each monthly limit, `month` = "YYYY-MM". */
export function budgetUsage(budgets: BudgetRecord[], txs: TransactionRecord[], month: string): BudgetUsage[] {
  return budgets
    .filter((b) => b.limit > 0)
    .map((b) => {
      const spent = txs
        .filter((t) => t.kind === "out" && t.category === b.category && t.date.startsWith(month))
        .reduce((s, t) => s + t.amount, 0);
      const ratio = spent / b.limit;
      return { budget: b, spent, ratio, level: levelOf(ratio) };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/**
 * After saving an expense: a message when it pushed its category past 80%
 * or past the limit for that month, otherwise null.
 */
export async function budgetAlert(
  userId: string,
  tx: { kind: "in" | "out"; category: string; amount: number; date: string },
): Promise<{ text: string; tone: "warn" | "danger" } | null> {
  if (tx.kind !== "out") return null;
  const db = getDB();
  const budget = (await db.budgets.where("userId").equals(userId).toArray()).find(
    (b) => !b.deletedAt && b.category === tx.category && b.limit > 0,
  );
  if (!budget) return null;
  const month = tx.date.slice(0, 7);
  const spent = (await db.transactions.where("userId").equals(userId).toArray())
    .filter((t) => !t.deletedAt && t.kind === "out" && t.category === tx.category && t.date.startsWith(month))
    .reduce((s, t) => s + t.amount, 0);
  const before = (spent - tx.amount) / budget.limit;
  const after = spent / budget.limit;
  if (before < 1 && after >= 1) {
    return {
      text: `⚠️ ${tx.category} lewat batas bulan ini: ${formatRupiahShort(spent)} dari ${formatRupiahShort(budget.limit)}`,
      tone: "danger",
    };
  }
  if (before < WARN_AT && after >= WARN_AT) {
    return {
      text: `${tx.category} sudah ${Math.round(after * 100)}% dari batas bulan ini — sisa ${formatRupiahShort(budget.limit - spent)}`,
      tone: "warn",
    };
  }
  return null;
}
