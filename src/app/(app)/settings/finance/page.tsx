"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import {
  deleteBudget,
  deleteRecurring,
  upsertBudget,
  upsertRecurring,
  useBudgets,
  useRecurring,
  useTransactions,
} from "@/stores/data";
import type { BudgetRecord, RecurringRecord } from "@/lib/db";
import { formatRupiah, formatRupiahShort, todayISO } from "@/lib/utils";
import { CURRENCIES, useCurrency } from "@/stores/currency";

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

export default function FinancePage() {
  const reduce = useReducedMotion();
  const userId = useAuth((s) => s.userId);
  const recurring = useRecurring(userId) ?? [];
  const budgets = useBudgets(userId) ?? [];
  const txs = useTransactions(userId) ?? [];
  const [editingR, setEditingR] = useState<RecurringRecord | null>(null);
  const [editingB, setEditingB] = useState<BudgetRecord | null>(null);
  const [addR, setAddR] = useState(false);
  const [addB, setAddB] = useState(false);

  const spendByCategory = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.kind !== "out") continue;
      if (new Date(t.date).getTime() < monthStart.getTime()) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return map;
  }, [txs]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Uang & anggaran"
      />

      <div className="space-y-4 px-4 pb-8">
        <CurrencySection />

        <section className="surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-bold section-label text-text-3">
              Transaksi rutin
            </div>
            <button
              type="button"
              onClick={() => setAddR(true)}
              className="min-h-[44px] rounded-full bg-accent px-3.5 py-2 text-[12px] font-semibold text-accent-fg"
            >
              + Tambah
            </button>
          </div>
          {recurring.length === 0 ? (
            <p className="text-xs text-text-4">
              Belum ada. Misal: internet 250rb/bulan, kos 1jt/bulan.
            </p>
          ) : (
            <ul className="space-y-2">
              {recurring.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setEditingR(r)}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-[14px] bg-bg-elev2 px-3 py-2 text-left theme-transition"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {r.kind === "in" ? "+" : "−"} {formatRupiah(r.amount)}
                        <span className="ml-2 text-[12px] text-text-3">
                          {r.category} · {r.interval}
                        </span>
                      </div>
                      <div className="text-[12px] text-text-3">
                        Selanjutnya {r.nextDue} · {r.who}
                      </div>
                    </div>
                    <span
                      className={`text-[12px] font-semibold ${
                        r.active ? "text-[color:var(--positive)]" : "text-text-4"
                      }`}
                    >
                      {r.active ? "AKTIF" : "PAUSED"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-bold section-label text-text-3">
              Anggaran per kategori
            </div>
            <button
              type="button"
              onClick={() => setAddB(true)}
              className="min-h-[44px] rounded-full bg-accent px-3.5 py-2 text-[12px] font-semibold text-accent-fg"
            >
              + Set
            </button>
          </div>
          {budgets.length === 0 ? (
            <p className="text-xs text-text-4">
              Pasang batas bulanan per kategori supaya diingatkan sebelum lewat.
            </p>
          ) : (
            <ul className="space-y-2">
              {budgets.map((b) => {
                const spent = spendByCategory.get(b.category) ?? 0;
                const pct = Math.min(
                  100,
                  Math.round((spent / Math.max(1, b.limit)) * 100),
                );
                const warn = pct >= 80;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setEditingB(b)}
                      className="block min-h-[48px] w-full rounded-[14px] bg-bg-elev2 p-3 text-left theme-transition"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">
                          {b.category}
                        </span>
                        <span
                          className={`text-xs ${
                            warn
                              ? "text-[color:var(--negative)]"
                              : "text-text-2"
                          }`}
                        >
                          {formatRupiahShort(spent)} / {formatRupiahShort(b.limit)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-elev3">
                        <motion.div
                          className={`h-full origin-left ${
                            warn ? "bg-[color:var(--negative)]" : "bg-accent"
                          }`}
                          initial={reduce ? false : { scaleX: 0 }}
                          animate={{ scaleX: pct / 100 }}
                          transition={reduce ? { duration: 0.1 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <AnimatePresence>
        {(addR || editingR) && (
          <RecurringSheet
            key={editingR ? `rec-${editingR.id}` : "rec-new"}
            record={editingR}
            categories={CATEGORIES}
            onClose={() => {
              setAddR(false);
              setEditingR(null);
            }}
          />
        )}
        {(addB || editingB) && (
          <BudgetSheet
            key={editingB ? `bud-${editingB.id}` : "bud-new"}
            record={editingB}
            categories={CATEGORIES}
            onClose={() => {
              setAddB(false);
              setEditingB(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RecurringSheet({
  record,
  categories,
  onClose,
}: {
  record: RecurringRecord | null;
  categories: string[];
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const name = useAuth((s) => s.name);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const whoOptions = [...members.map((m) => m.name)];
  if (members.length >= 2) whoOptions.push(sharedLabel);

  const [kind, setKind] = useState<RecurringRecord["kind"]>(
    record?.kind ?? "out",
  );
  const [amount, setAmount] = useState(record?.amount?.toString() ?? "");
  const [category, setCategory] = useState(record?.category ?? categories[0]);
  const [interval, setInterval] = useState<RecurringRecord["interval"]>(
    record?.interval ?? "monthly",
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    record?.dayOfMonth?.toString() ?? "1",
  );
  const [nextDue, setNextDue] = useState(record?.nextDue ?? todayISO());
  const [who, setWho] = useState(record?.who ?? name ?? whoOptions[0] ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [active, setActive] = useState(record?.active ?? 1);

  async function save() {
    if (!userId) return;
    const amt = Number(amount);
    if (!amt) return;
    await upsertRecurring(userId, {
      id: record?.id,
      kind,
      amount: amt,
      category,
      interval,
      dayOfMonth: interval === "monthly" ? Number(dayOfMonth) || 1 : undefined,
      nextDue,
      who,
      note,
      active: active as 0 | 1,
    });
    onClose();
  }

  async function del() {
    if (!userId || !record) return;
    if (!confirm("Hapus transaksi berulang?")) return;
    await deleteRecurring(userId, record.id);
    onClose();
  }

  return (
    <Sheet
      title={record ? "Ubah transaksi rutin" : "Transaksi rutin baru"}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          {(["out", "in"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`min-h-[44px] flex-1 rounded-[14px] py-2 text-xs font-semibold transition-colors ${
                kind === k
                  ? "bg-text-1 text-bg-app"
                  : "bg-bg-elev2 text-text-2"
              }`}
            >
              {k === "out" ? "Keluar" : "Masuk"}
            </button>
          ))}
        </div>
        <Field label="Jumlah">
          <input
            type="number"
            className="input-base"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Kategori">
          <select
            className="input-base"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {whoOptions.length > 0 && (
          <Field label="Siapa">
            <select
              className="input-base"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              {whoOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Frekuensi">
          <select
            className="input-base"
            value={interval}
            onChange={(e) =>
              setInterval(e.target.value as RecurringRecord["interval"])
            }
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </Field>
        {interval === "monthly" && (
          <Field label="Tanggal tiap bulan">
            <input
              type="number"
              min={1}
              max={28}
              className="input-base"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
          </Field>
        )}
        <Field label="Mulai dari">
          <input
            type="date"
            className="input-base"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
          />
        </Field>
        <Field label="Catatan (opsional)">
          <input
            className="input-base"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="misal: Netflix, kos bulanan"
          />
        </Field>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[14px] bg-bg-elev2 px-3 py-2 text-xs">
          <input
            type="checkbox"
            checked={active === 1}
            onChange={(e) => setActive(e.target.checked ? 1 : 0)}
            className="h-5 w-5 accent-[color:var(--accent)]"
          />
          Aktif (auto-tambah transaksi)
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button type="button" onClick={del} className="btn-danger text-sm">
              Hapus
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function BudgetSheet({
  record,
  categories,
  onClose,
}: {
  record: BudgetRecord | null;
  categories: string[];
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const [category, setCategory] = useState(record?.category ?? categories[0]);
  const [limit, setLimit] = useState(record?.limit?.toString() ?? "");

  async function save() {
    if (!userId) return;
    const lim = Number(limit);
    if (!lim) return;
    await upsertBudget(userId, { id: record?.id, category, limit: lim });
    onClose();
  }

  async function del() {
    if (!userId || !record) return;
    if (!confirm("Hapus anggaran ini?")) return;
    await deleteBudget(userId, record.id);
    onClose();
  }

  return (
    <Sheet title={record ? "Ubah anggaran" : "Atur anggaran"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Kategori">
          <select
            className="input-base"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Limit / bulan">
          <input
            type="number"
            className="input-base"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <button type="button" onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button type="button" onClick={del} className="btn-danger text-sm">
              Hapus
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-bold section-label text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}

function CurrencySection() {
  const code = useCurrency((s) => s.code);
  const setCurrency = useCurrency((s) => s.setCurrency);
  const active = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

  function onChange(next: string) {
    if (next === code) return;
    setCurrency(next);
    // Forcing a reload is the simplest way to get every cached
    // formatRupiah call to re-evaluate with the new locale.
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <section className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-bold section-label text-text-3">
          Mata uang
        </div>
        <span className="text-[12px] text-text-4">
          {active.symbol} · {active.code}
        </span>
      </div>
      <label htmlFor="currency-pick" className="sr-only">
        Pilih mata uang
      </label>
      <select
        id="currency-pick"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] w-full rounded-[14px] bg-bg-elev2 px-3 py-2 text-sm theme-transition"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code} ({c.label})
          </option>
        ))}
      </select>
      <p className="mt-2 text-[12px] text-text-4">
        Halaman akan dimuat ulang agar format angka menyesuaikan.
      </p>
    </section>
  );
}
