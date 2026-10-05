import type { DepositRecord, EntryRecord, ItemRecord, TransactionRecord } from "@/lib/db";
import { parsePayload, isoDay } from "@/lib/people";
import { toWallet, walletOf, type TransferPayload } from "@/lib/wallet";
import { paymentsOf, readBill } from "@/lib/bills";

/**
 * Net worth = money in wallets + savings in Goals + money lent − debts −
 * what's left on installment plans. Everything is recomputed "as of" a date,
 * so the same function draws the month-by-month history.
 */
export interface NetWorthInput {
  walletItems: ItemRecord[];
  txs: TransactionRecord[];
  transfers: EntryRecord[];
  deposits: DepositRecord[];
  debts: ItemRecord[];
  bills: ItemRecord[];
  billPaid: EntryRecord[];
}

export interface NetWorth {
  wallets: number;
  savings: number;
  lent: number;
  owe: number;
  installments: number;
  total: number;
}

const day = (ts: number) => isoDay(new Date(ts));

export function netWorthAt(asOf: string, d: NetWorthInput): NetWorth {
  // Wallet balances as of the date (a wallet counts from the day it was added).
  const wallets = d.walletItems.filter((w) => day(w.createdAt) <= asOf && w.status !== "archived").map(toWallet);
  const ids = new Set(wallets.map((w) => w.id));
  let walletSum = wallets.reduce((s, w) => s + w.initial, 0);
  for (const t of d.txs) {
    if (t.date > asOf) continue;
    const w = walletOf(t);
    if (w && ids.has(w)) walletSum += t.kind === "in" ? t.amount : -t.amount;
  }
  // Transfers between tracked wallets net to zero unless one side isn't tracked.
  for (const e of d.transfers) {
    if (e.date > asOf) continue;
    const p = parsePayload<TransferPayload>(e.payload, { from: "", to: "" });
    const amt = e.valueNum ?? 0;
    if (ids.has(p.from)) walletSum -= amt;
    if (ids.has(p.to)) walletSum += amt;
  }

  const savings = d.deposits.filter((x) => x.date <= asOf).reduce((s, x) => s + x.amount, 0);

  let lent = 0;
  let owe = 0;
  for (const it of d.debts) {
    const opened = it.date ?? day(it.createdAt);
    if (opened > asOf) continue;
    const settledOn = it.status === "settled" ? it.due ?? day(it.updatedAt) : null;
    if (settledOn && settledOn <= asOf) continue;
    const dir = parsePayload(it.payload, { direction: "owe" }).direction;
    if (dir === "lent") lent += it.amount ?? 0;
    else owe += it.amount ?? 0;
  }

  let installments = 0;
  for (const b of d.bills) {
    const p = readBill(b);
    if (p.type !== "cicilan" || !p.total || day(b.createdAt) > asOf) continue;
    const paid = new Set(paymentsOf(b.id, d.billPaid).filter((e) => e.date <= asOf).map((e) => e.valueText)).size;
    installments += Math.max(0, p.total - paid) * (b.amount ?? 0);
  }

  return {
    wallets: walletSum,
    savings,
    lent,
    owe,
    installments,
    total: walletSum + savings + lent - owe - installments,
  };
}

/** Last day of each of the past `n` months, ending with today. */
export function monthEnds(n: number, today = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const end = i === 0 ? today : new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    out.push(isoDay(end));
  }
  return out;
}
