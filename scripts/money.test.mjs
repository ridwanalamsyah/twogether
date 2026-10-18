// Money maths that both partners rely on: who owes whom, wallet balances,
// budget levels and bill due dates. Run with the alias loader (see package.json).
process.env.TZ = "Asia/Jakarta";
import assert from "node:assert/strict";

const { splitBalance } = await import("@/lib/split");
const { walletBalances } = await import("@/lib/wallet");
const { budgetUsage } = await import("@/lib/budget");
const { dueIn, shiftMonthKey, billState } = await import("@/lib/bills");

// ── Patungan ──────────────────────────────────────────────
const split = (who, owe) => ({ kind: "split", who, payload: JSON.stringify({ note: "", mode: "half", owe }) });
const settle = (who, valueNum) => ({ kind: "split-settle", who, valueNum });
assert.equal(splitBalance([split("Ridwan", 50_000)], "Ridwan"), 50_000, "I paid: partner owes me");
assert.equal(splitBalance([split("Alyaa", 30_000)], "Ridwan"), -30_000, "partner paid: I owe");
assert.equal(
  splitBalance([split("Ridwan", 50_000), split("Alyaa", 30_000), settle("Alyaa", 20_000)], "Ridwan"),
  0,
  "settling up clears the balance",
);
assert.equal(splitBalance([{ kind: "split", who: "Ridwan", payload: "rusak{" }], "Ridwan"), 0, "broken payload counts as 0");

// ── Dompet ────────────────────────────────────────────────
const wallets = [
  { id: "bca", initial: 1_000_000 },
  { id: "gopay", initial: 0 },
];
const txs = [
  { kind: "out", amount: 200_000, tags: ["dompet:bca"] },
  { kind: "in", amount: 50_000, tags: ["dompet:gopay"] },
  { kind: "out", amount: 999, tags: ["dompet:hilang"] },
];
const transfers = [{ valueNum: 100_000, payload: JSON.stringify({ from: "bca", to: "gopay" }) }];
assert.deepEqual(walletBalances(wallets, txs, transfers), { bca: 700_000, gopay: 150_000 });

// ── Budget ────────────────────────────────────────────────
const budgets = [
  { category: "Makan", limit: 1_000_000 },
  { category: "Jajan", limit: 100_000 },
  { category: "Kosong", limit: 0 },
];
const spend = [
  { kind: "out", category: "Makan", amount: 850_000, date: "2026-10-05" },
  { kind: "out", category: "Makan", amount: 500_000, date: "2026-09-30" },
  { kind: "out", category: "Jajan", amount: 120_000, date: "2026-10-01" },
  { kind: "in", category: "Makan", amount: 1_000_000, date: "2026-10-02" },
];
const usage = budgetUsage(budgets, spend, "2026-10");
assert.deepEqual(
  usage.map((u) => [u.budget.category, u.spent, u.level]),
  [
    ["Jajan", 120_000, "over"],
    ["Makan", 850_000, "warn"],
  ],
  "only this month's spending; zero limits ignored; worst first",
);

// ── Tagihan ───────────────────────────────────────────────
assert.equal(dueIn(31, "2026-02"), "2026-02-28", "31st clamps to short months");
assert.equal(dueIn(31, "2028-02"), "2028-02-29", "leap year");
assert.equal(shiftMonthKey("2026-01", -1), "2025-12");
assert.equal(shiftMonthKey("2026-12", 1), "2027-01");

const bill = {
  id: "listrik",
  createdAt: new Date(2026, 0, 1).getTime(),
  payload: JSON.stringify({ type: "tagihan", day: 10, category: "Listrik" }),
};
const paidSept = [{ valueText: "2026-09", payload: JSON.stringify({ billId: "listrik" }) }];
let s = billState(bill, paidSept, "2026-10-08");
assert.equal(s.month, "2026-10");
assert.equal(s.daysLeft, 2, "due on the 10th, two days left");
assert.equal(s.paid, false);
s = billState(bill, [], "2026-10-08");
assert.equal(s.month, "2026-09", "last month unpaid stays late, not rolled over");
assert.ok(s.daysLeft < 0);

console.log("money ok");
