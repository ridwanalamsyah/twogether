import type { EntryRecord, ItemRecord } from "@/lib/db";
import { parsePayload, isoDay, daysBetween } from "@/lib/people";

/**
 * Monthly bills: items kind "bill". Paying one logs an expense and an entry
 * kind "bill-paid" (valueText = "YYYY-MM") so both phones see it as paid.
 */
export type BillType = "tagihan" | "langganan" | "cicilan";

export interface BillPayload {
  type: BillType;
  /** Day of month it's due (1–31, clamped to short months). */
  day: number;
  category: string;
  emoji: string;
  /** Cicilan: number of monthly payments in total. */
  total?: number;
  walletId?: string | null;
}

export const DEFAULT_BILL: BillPayload = { type: "tagihan", day: 1, category: "Lainnya", emoji: "🧾" };

export const BILL_PRESETS: { title: string; emoji: string; type: BillType; category: string }[] = [
  { title: "Listrik / token", emoji: "⚡", type: "tagihan", category: "Rumah" },
  { title: "Air PDAM", emoji: "🚰", type: "tagihan", category: "Rumah" },
  { title: "Kos / kontrakan", emoji: "🏠", type: "tagihan", category: "Rumah" },
  { title: "Internet / WiFi", emoji: "📶", type: "tagihan", category: "Rumah" },
  { title: "Pulsa & kuota", emoji: "📱", type: "tagihan", category: "Lainnya" },
  { title: "BPJS", emoji: "🏥", type: "tagihan", category: "Lainnya" },
  { title: "Netflix", emoji: "🎬", type: "langganan", category: "Langganan" },
  { title: "Spotify", emoji: "🎵", type: "langganan", category: "Langganan" },
  { title: "iCloud", emoji: "☁️", type: "langganan", category: "Langganan" },
  { title: "Cicilan HP", emoji: "📲", type: "cicilan", category: "Cicilan" },
  { title: "Cicilan motor", emoji: "🛵", type: "cicilan", category: "Cicilan" },
];

export const monthKey = (iso: string) => iso.slice(0, 7);

export function shiftMonthKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Due date of a bill in a given month, clamping the 31st to short months. */
export function dueIn(day: number, key: string): string {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${key}-${String(Math.min(Math.max(1, day), last)).padStart(2, "0")}`;
}

export const readBill = (b: ItemRecord) => parsePayload<BillPayload>(b.payload, DEFAULT_BILL);

export function paymentsOf(billId: string, paid: EntryRecord[]) {
  return paid.filter((e) => parsePayload(e.payload, { billId: "" }).billId === billId);
}

export interface BillState {
  bill: ItemRecord;
  p: BillPayload;
  /** Month this card is about (the earliest unpaid one, up to this month). */
  month: string;
  due: string;
  daysLeft: number;
  paid: boolean;
  paidCount: number;
  /** Cicilan finished. */
  finished: boolean;
}

/**
 * Where a bill stands today. An unpaid bill from last month stays "late"
 * instead of silently rolling over.
 */
export function billState(bill: ItemRecord, paid: EntryRecord[], today = isoDay(new Date())): BillState {
  const p = readBill(bill);
  const mine = paymentsOf(bill.id, paid);
  const paidMonths = new Set(mine.map((e) => e.valueText));
  const paidCount = paidMonths.size;
  const finished = p.type === "cicilan" && !!p.total && paidCount >= p.total;
  const cur = monthKey(today);
  const created = isoDay(new Date(bill.createdAt));
  const prev = shiftMonthKey(cur, -1);
  // Last month's bill still unpaid — only if the bill already existed on that due date.
  const prevLate = !paidMonths.has(prev) && dueIn(p.day, prev) >= created;
  // Added after this month's due date → the first one is next month.
  const month =
    !finished && prevLate
      ? prev
      : dueIn(p.day, cur) < created && !paidMonths.has(cur)
        ? shiftMonthKey(cur, 1)
        : cur;
  const due = dueIn(p.day, month);
  return {
    bill,
    p,
    month,
    due,
    daysLeft: daysBetween(today, due),
    paid: paidMonths.has(month),
    paidCount,
    finished,
  };
}

export function dueLabel(s: BillState): string {
  if (s.finished) return "Lunas 🎉";
  if (s.paid) return "Sudah dibayar ✓";
  if (s.daysLeft < 0) return `Telat ${-s.daysLeft} hari`;
  if (s.daysLeft === 0) return "Hari ini";
  if (s.daysLeft === 1) return "Besok";
  return `${s.daysLeft} hari lagi`;
}
