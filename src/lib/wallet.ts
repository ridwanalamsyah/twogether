import type { EntryRecord, ItemRecord, TransactionRecord } from "@/lib/db";
import { parsePayload } from "@/lib/people";

/**
 * Wallets (BCA, GoPay, Tunai…). A transaction belongs to a wallet through a
 * `dompet:<id>` tag, so no database change is needed; transfers between
 * wallets are `wallet-transfer` entries.
 */
export const WALLET_TAG = "dompet:";

export interface WalletPayload {
  emoji: string;
  initial: number;
}

export interface Wallet {
  id: string;
  name: string;
  emoji: string;
  initial: number;
  archived: boolean;
}

export function toWallet(i: ItemRecord): Wallet {
  const p = parsePayload<WalletPayload>(i.payload, { emoji: "👛", initial: 0 });
  return { id: i.id, name: i.title, emoji: p.emoji, initial: p.initial, archived: i.status === "archived" };
}

export function walletOf(tx: Pick<TransactionRecord, "tags">): string | null {
  const t = (tx.tags ?? []).find((x) => x.startsWith(WALLET_TAG));
  return t ? t.slice(WALLET_TAG.length) : null;
}

/** Replace any wallet tag with `walletId` (or remove it). */
export function withWallet(tags: string[] | undefined, walletId: string | null): string[] | undefined {
  const rest = (tags ?? []).filter((t) => !t.startsWith(WALLET_TAG));
  const next = walletId ? [...rest, WALLET_TAG + walletId] : rest;
  return next.length ? next : undefined;
}

export interface TransferPayload {
  from: string;
  to: string;
  note?: string;
}

export function walletBalances(
  wallets: Wallet[],
  txs: TransactionRecord[],
  transfers: EntryRecord[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const w of wallets) bal[w.id] = w.initial;
  for (const t of txs) {
    const w = walletOf(t);
    if (!w || !(w in bal)) continue;
    bal[w] += t.kind === "in" ? t.amount : -t.amount;
  }
  for (const e of transfers) {
    const p = parsePayload<TransferPayload>(e.payload, { from: "", to: "" });
    const amt = e.valueNum ?? 0;
    if (p.from in bal) bal[p.from] -= amt;
    if (p.to in bal) bal[p.to] += amt;
  }
  return bal;
}

export const WALLET_EMOJIS = ["👛", "💵", "🏦", "💳", "📱", "🐷", "💼", "🪙"];

const LAST_KEY = "twogether:last-wallet";
export function lastWallet(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
export function rememberWallet(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_KEY, id);
    else localStorage.removeItem(LAST_KEY);
  } catch {
    /* ignore */
  }
}
