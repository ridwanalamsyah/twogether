"use client";

import { useNick } from "@/lib/nick";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/shell/AppHeader";
import { CountUp } from "@/components/ui/CountUp";
import { usePeople } from "@/lib/people";
import { BudgetCard } from "@/components/budget/BudgetCard";
import { budgetAlert } from "@/lib/budget";
import { toast } from "@/lib/toast";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import {
  addTransaction,
  deleteTransaction,
  useEntries,
  useItems,
  useTransactions,
  useTrips,
} from "@/stores/data";
import { Sheet, FieldGroup, Chips } from "@/components/ui/Sheet";
import { IconTile, categoryIcon, spaceIcon } from "@/lib/icons";
import { WalletBadge } from "@/components/wallet/WalletBadge";
import { billState } from "@/lib/bills";
import {
  Bell,
  ChartLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  formatRupiah,
  formatRupiahShort,
  todayISO,
} from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { ReceiptScanButton } from "@/components/ui/ReceiptScan";
import { WalletPicker, WalletStrip, useWallets } from "@/components/wallet/Wallets";
import { WALLET_TAG, lastWallet, rememberWallet, walletOf, withWallet } from "@/lib/wallet";

function dayLabel(iso: string): string {
  const today = todayISO();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (iso === today) return "Hari ini";
  if (iso === yesterday) return "Kemarin";
  const [yy, mm, dd] = iso.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

const CATEGORIES = [
  "Makan",
  "Bensin",
  "Laundry",
  "Skincare",
  "Kuliah",
  "Usaha",
  "Ortu",
  "Tabungan",
  "Jajan",
  "Lainnya",
];

export default function TrackerPage() {
  const { nick } = useNick();
  const { me, partner } = usePeople();
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const userId = useAuth((s) => s.userId);
  const reduce = useReducedMotion();
  const txs = useTransactions(userId);
  const bills = useItems(userId, "bill") ?? [];
  const billPaid = useEntries(userId, "bill-paid") ?? [];
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [wallet, setWallet] = useState<string | null>(null);
  const { wallets, balances } = useWallets();
  const walletById = (id: string | null) => wallets.find((w) => w.id === id);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const thisMonth = todayISO().slice(0, 7);

  const filtered = useMemo(() => {
    return (txs ?? [])
      .filter((t) => (search ? true : t.date.startsWith(month)))
      .filter((t) => (filter === "all" ? true : t.kind === filter))
      .filter((t) => (wallet ? walletOf(t) === wallet : true))
      .filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.note?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.who.toLowerCase().includes(q)
        );
      });
  }, [txs, filter, search, wallet, month]);

  const sum = useMemo(() => {
    let inc = 0;
    let out = 0;
    for (const t of txs ?? []) {
      if (!t.date.startsWith(month)) continue;
      if (t.kind === "in") inc += t.amount;
      else out += t.amount;
    }
    // Net movement over the last 7 days, for the little trend chip.
    const weekAgo = shiftDay(todayISO(), -7);
    const week = (txs ?? [])
      .filter((t) => t.date > weekAgo)
      .reduce((s, t) => s + (t.kind === "in" ? t.amount : -t.amount), 0);
    return { inc, out, net: inc - out, week };
  }, [txs, month]);

  // Who spent what this month — the "berdua" view.
  const split = useMemo(() => {
    const by = new Map<string, number>();
    for (const t of txs ?? []) {
      if (t.kind !== "out" || !t.date.startsWith(month)) continue;
      by.set(t.who || me, (by.get(t.who || me) ?? 0) + t.amount);
    }
    const order = [me, partner, sharedLabel].filter(Boolean) as string[];
    const colors = ["var(--accent)", "var(--info)", "var(--text-4)"];
    const parts = Array.from(by.entries())
      .sort((x, y) => (order.indexOf(x[0]) + 99) % 99 - (order.indexOf(y[0]) + 99) % 99)
      .map(([who, v], i) => ({
        who,
        v,
        label: who === me ? "Kamu" : nick(who),
        color: colors[order.indexOf(who) >= 0 ? order.indexOf(who) : Math.min(i, 2)],
      }));
    return { parts, total: Math.max(1, parts.reduce((s, x) => s + x.v, 0)) };
  }, [txs, month, me, partner, sharedLabel, nick]);

  const totalBalance = wallets.reduce((s, w) => s + (balances[w.id] ?? 0), 0);
  // Only show a wallet total once wallets actually hold money (a starting
  // balance or tagged transactions) — otherwise "Rp 0" would just mislead.
  const hasWallets = wallets.some((w) => w.initial !== 0) || (txs ?? []).some((t) => !!walletOf(t));
  const dueBills = bills
    .filter((b) => b.status !== "archived")
    .map((b) => billState(b, billPaid))
    .filter((x) => !x.paid && !x.finished && x.daysLeft <= 3).length;

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.date.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items: [...items].sort((x, y) => y.createdAt - x.createdAt),
      total: items.reduce((s, t) => s + (t.kind === "in" ? t.amount : -t.amount), 0),
    }));
  }, [filtered]);

  const monthDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  const monthLabel = monthDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const monthShort = monthDate.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
  const filterLabel =
    (filter === "all" ? "Semua" : filter === "out" ? "Keluar" : "Masuk") + (wallet ? ` · ${walletById(wallet)?.name ?? ""}` : "");

  return (
    <div className="min-h-full">
      <AppHeader
        title="Uang"
        actions={
          <Link href="/tagihan" aria-label="Tagihan" className="relative -mr-1.5 flex h-11 w-11 items-center justify-center rounded-full text-text-3 hover:bg-bg-elev2">
            <Bell size={18} strokeWidth={1.8} aria-hidden />
            {dueBills > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[color:var(--negative)] ring-2 ring-[color:var(--bg-app)]" />}
          </Link>
        }
      />

      <div className="space-y-3 px-4 pb-6">
        {/* Uang kita: the month at a glance, framed for two */}
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-1 px-2.5 pt-2.5 sm:px-4">
            <div className="flex min-w-0 items-center rounded-full bg-bg-elev1">
              <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-3 hover:text-text-1">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="truncate px-0.5 text-[13px] font-semibold text-text-2 sm:hidden">{monthShort}</span>
              <span className="hidden truncate px-1 text-[13px] font-semibold text-text-2 sm:inline">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, 1))}
                disabled={month >= thisMonth}
                aria-label="Bulan berikutnya"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-3 hover:text-text-1 disabled:opacity-30"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
            <Link href="/laporan" className="inline-flex min-h-[44px] shrink-0 items-center gap-0.5 px-1 text-[12px] font-semibold text-accent">
              Laporan <ChevronRight size={14} aria-hidden />
            </Link>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="text-[13px] text-text-3">{hasWallets && month === thisMonth ? "Total saldo kita" : "Sisa uang kita"}</div>
            <div className={`num-hero mt-1 text-[34px] ${!hasWallets && sum.net < 0 ? "text-[color:var(--negative)]" : "text-text-1"}`}>
              <CountUp value={hasWallets && month === thisMonth ? totalBalance : sum.net} format={formatRupiah} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <span className="flex items-center gap-1.5 text-text-3">
                <TrendingUp size={14} className="text-[color:var(--positive)]" aria-hidden /> Masuk <b className="num font-semibold text-text-1">{formatRupiahShort(sum.inc)}</b>
              </span>
              <span className="flex items-center gap-1.5 text-text-3">
                <TrendingDown size={14} className="text-[color:var(--negative)]" aria-hidden /> Keluar <b className="num font-semibold text-text-1">{formatRupiahShort(sum.out)}</b>
              </span>
            </div>
          </div>

          {split.parts.length > 0 && (
            <div className="border-t border-[color:var(--hairline)] px-4 pb-4 pt-3">
              <div className="mb-2 text-[12px] font-medium text-text-3">Yang keluar bulan ini</div>
              <div className="flex h-2 overflow-hidden rounded-full bg-bg-elev2">
                {split.parts.map((x) => (
                  <motion.span
                    key={x.who}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={reduce ? { duration: 0.05 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ originX: 0, width: `${(x.v / split.total) * 100}%`, background: x.color }}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {split.parts.map((x) => (
                  <span key={x.who} className="flex items-center gap-1.5 text-[12px] text-text-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: x.color }} />
                    {x.label} <span className="num font-semibold text-text-1">{formatRupiahShort(x.v)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Shortcuts */}
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
          {[
            { href: "/tagihan", label: "Tagihan" },
            { href: "/dompet", label: "Dompet" },
            { href: "/laporan", label: "Laporan" },
            { href: "/aset", label: "Aset" },
            { href: "/impor", label: "Impor" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-[44px] w-[68px] shrink-0 flex-col items-center gap-1.5 py-1 active:opacity-70">
              <IconTile spec={spaceIcon(l.href)} size={48} radius={16} />
              <span className="text-[12px] font-medium text-text-2">{l.label}</span>
            </Link>
          ))}
        </div>

        {month === thisMonth && <BudgetCard txs={txs ?? []} month={month} categories={CATEGORIES} />}

        {/* Transactions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3">
          <h2 className="text-[19px] font-semibold text-text-1">Transaksi</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              aria-label="Tambah transaksi"
              className="grid h-11 w-11 place-items-center rounded-full bg-bg-card text-text-2 ring-1 ring-[color:var(--hairline)]"
            >
              <Plus size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setSearching((v) => !v)}
              aria-label="Cari"
              aria-pressed={searching}
              className={`grid h-11 w-11 place-items-center rounded-full ring-1 ring-[color:var(--hairline)] ${searching ? "bg-text-1 text-bg-app" : "bg-bg-card text-text-2"}`}
            >
              <Search size={17} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex h-11 items-center gap-1 rounded-full bg-bg-card px-3.5 text-[13px] font-medium text-text-1 ring-1 ring-[color:var(--hairline)]"
            >
              <span className="max-w-[110px] truncate">{filterLabel}</span>
              <ChevronDown size={15} className="text-text-3" aria-hidden />
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {searching && (
            <motion.div
              key="tracker-search"
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.16 }}
            >
              <label htmlFor="tracker-search" className="sr-only">Cari transaksi</label>
              <input
                id="tracker-search"
                autoFocus
                className="input-base h-11 bg-bg-card"
                type="search"
                placeholder="Cari catatan, kategori, nama…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {groups.length === 0 ? (
          <div className="py-12 text-center">
            <IconTile spec={{ Icon: Receipt, tint: "var(--tint-slate)" }} size={52} radius={18} className="mx-auto" />
            <div className="mt-3 text-[14px] text-text-3">
              {search ? "Tidak ada yang cocok." : `Belum ada transaksi di ${monthLabel}.`}
            </div>
            {!search && (
              <button type="button" onClick={() => setShowAdd(true)} className="btn-accent mt-4 min-h-[44px] px-5 py-2.5 text-[14px]">
                Catat transaksi
              </button>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.date}>
              <div className="flex items-baseline justify-between px-1 pb-2 pt-3 text-[13px]">
                <span className="font-medium text-text-3">{dayLabel(g.date)}</span>
                <span className="num text-text-3">
                  Total {g.total >= 0 ? "+" : "−"}
                  {formatRupiah(Math.abs(g.total))}
                </span>
              </div>
              <ul className="space-y-2">
                {g.items.map((t) => {
                  const w = walletById(walletOf(t));
                  const extraTags = (t.tags ?? []).filter((tag) => !tag.startsWith(WALLET_TAG));
                  return (
                    <li key={t.id} className="overflow-hidden rounded-[20px]">
                      <SwipeRow onDelete={() => userId && deleteTransaction(userId, t.id)}>
                        <div className="surface flex items-center gap-3 rounded-[20px] px-3.5 py-3">
                          <IconTile spec={categoryIcon(t.category, t.kind)} size={46} radius={14} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-medium text-text-1">{t.note || t.category}</div>
                            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-text-3">
                              {w ? (
                                <>
                                  <WalletBadge name={w.name} size={18} />
                                  <span className="truncate">{w.name}</span>
                                </>
                              ) : (
                                <span className="truncate">
                                  {t.note ? `${t.category} · ` : ""}
                                  {nick(t.who)}
                                </span>
                              )}
                              {extraTags.slice(0, 2).map((tag) => (
                                <span key={tag} className="shrink-0 text-text-4">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={`num text-[15px] font-semibold ${t.kind === "in" ? "text-[color:var(--positive)]" : "text-[color:color-mix(in_srgb,var(--negative)_85%,var(--text-1))]"}`}>
                              {t.kind === "in" ? "+ " : "− "}
                              {formatRupiah(t.amount)}
                            </div>
                            <div className="num mt-1 text-[12px] text-text-4">
                              {new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </SwipeRow>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <AnimatePresence>
        {filterOpen && (
          <Sheet key="tracker-filter" title="Tampilkan" onClose={() => setFilterOpen(false)}>
            <FieldGroup label="Jenis">
              <Chips
                options={[
                  { value: "all", label: "Semua" },
                  { value: "out", label: "Keluar" },
                  { value: "in", label: "Masuk" },
                ]}
                value={filter}
                onChange={(v) => setFilter(v as typeof filter)}
              />
            </FieldGroup>
            {wallets.length > 0 && (
              <FieldGroup label="Dompet">
                <WalletStrip selected={wallet} onSelect={setWallet} />
              </FieldGroup>
            )}
            <button type="button" onClick={() => setFilterOpen(false)} className="btn-accent mt-2 min-h-[48px] w-full">Selesai</button>
          </Sheet>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAdd && <AddTxSheet key="tracker-add" onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}

function shiftMonth(key: string, n: number) {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shiftDay(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function AddTxSheet({ onClose }: { onClose: () => void }) {
  const { nick } = useNick();
  const userId = useAuth((s) => s.userId);
  const reduce = useReducedMotion();
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const people = useMemo(
    () =>
      members.length === 0
        ? ["Saya"]
        : members.length >= 2
          ? [...members.map((m) => m.name), sharedLabel]
          : members.map((m) => m.name),
    [members, sharedLabel],
  );
  const [kind, setKind] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [who, setWho] = useState(people[0]);
  useEffect(() => {
    if (!people.includes(who)) setWho(people[0]);
  }, [people, who]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tags, setTags] = useState<string[]>([]);
  const [walletId, setWalletId] = useState<string | null>(() => lastWallet());
  const { wallets } = useWallets();
  const [busy, setBusy] = useState(false);
  const trips = useTrips(userId) ?? [];
  const tagSuggestions = useMemo(
    () => [...trips.map((t) => t.tag), "jajan", "kerja", "darurat", "hadiah"],
    [trips],
  );

  async function submit() {
    if (!userId || busy) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    // A cleared date input gives "".
    const day = date || todayISO();
    // A remembered wallet may have been deleted since.
    const wallet = wallets.some((w) => w.id === walletId) ? walletId : null;
    setBusy(true);
    try {
      await addTransaction(userId, {
        kind,
        amount: num,
        category,
        who,
        note: note.trim() || undefined,
        date: day,
        tags: withWallet(tags, wallet),
      });
    } finally {
      setBusy(false);
    }
      void budgetAlert(userId, { kind, category, amount: num, date: day }).then((a) => a && toast(a.text, a.tone));
    onClose();
  }

  return (
    <Sheet
      title="Tambah transaksi"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={busy || !amount}
          className="btn-accent min-h-[48px] w-full text-sm disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
      }
    >
      <div className="mb-3 flex gap-5 border-b border-border text-sm">
        {(["out", "in"] as const).map((k) => {
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              onClick={() => setKind(k)}
              className={`relative -mb-px min-h-[44px] pb-2 font-medium transition-colors ${
                active ? "text-text-1" : "text-text-4"
              }`}
            >
              {k === "out" ? "Pengeluaran" : "Pemasukan"}
              {active && (
                <motion.span
                  layoutId="tracker-tx-kind"
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-text-1"
                  transition={reduce ? { duration: 0.05 } : { type: "spring", stiffness: 520, damping: 36 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <WalletPicker
          value={walletId}
          onChange={(id) => {
            setWalletId(id);
            rememberWallet(id);
          }}
        />
        {kind === "out" && (
          <ReceiptScanButton
            onResult={(r) => {
              if (r.amount) setAmount(String(r.amount));
              if (r.merchant && !note) setNote(r.merchant);
            }}
          />
        )}
        <label htmlFor="tx-amount" className="sr-only">Nominal</label>
        <input
          id="tx-amount"
          className="input-base text-lg font-semibold tabular-nums"
          inputMode="numeric"
          placeholder="Rp0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="tx-category" className="sr-only">Kategori</label>
            <select
              id="tx-category"
              className="input-base text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tx-who" className="sr-only">Siapa</label>
            <select
              id="tx-who"
              className="input-base text-sm"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              {people.map((p) => (
                <option key={p} value={p}>{nick(p)}</option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="tx-note" className="sr-only">Catatan</label>
        <input
          id="tx-note"
          className="input-base text-sm"
          placeholder="Catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label htmlFor="tx-date" className="sr-only">Tanggal</label>
        <input
          id="tx-date"
          type="date"
          className="input-base text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="Tag (opsional, mis. trip:bali)…"
        />
      </div>
    </Sheet>
  );
}
