"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
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
        title="Keuangan"
        subtitle="Recurring & budget"
        actions={
          <Link
            href="/settings"
            className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
          >
            Selesai
          </Link>
        }
      />

      <div className="space-y-4 px-4 pb-8">
        <CurrencySection />

        <section className="surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
              Transaksi berulang
            </div>
            <button
              onClick={() => setAddR(true)}
              className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg"
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
                    onClick={() => setEditingR(r)}
                    className="flex w-full items-center justify-between rounded-md bg-bg-elev2 px-3 py-2 text-left theme-transition"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {r.kind === "in" ? "+" : "−"} {formatRupiah(r.amount)}
                        <span className="ml-2 text-[10px] text-text-3">
                          {r.category} · {r.interval}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-3">
                        Selanjutnya {r.nextDue} · {r.who}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
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
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
              Budget per kategori
            </div>
            <button
              onClick={() => setAddB(true)}
              className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg"
            >
              + Set
            </button>
          </div>
          {budgets.length === 0 ? (
            <p className="text-xs text-text-4">
              Set limit bulanan per kategori untuk dapet alert kalau hampir
              kelewat.
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
                      onClick={() => setEditingB(b)}
                      className="block w-full rounded-md bg-bg-elev2 p-3 text-left theme-transition"
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
                        <div
                          className={`h-full ${
                            warn ? "bg-[color:var(--negative)]" : "bg-accent"
                          }`}
                          style={{ width: `${pct}%` }}
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

      {(addR || editingR) && (
        <RecurringSheet
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
          record={editingB}
          categories={CATEGORIES}
          onClose={() => {
            setAddB(false);
            setEditingB(null);
          }}
        />
      )}
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
      title={record ? "Edit recurring" : "Tambah recurring"}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          {(["out", "in"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-md py-2 text-xs font-semibold ${
                kind === k
                  ? "bg-accent text-accent-fg"
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
        <label className="flex items-center gap-2 rounded-md bg-bg-elev2 p-2.5 text-xs">
          <input
            type="checkbox"
            checked={active === 1}
            onChange={(e) => setActive(e.target.checked ? 1 : 0)}
          />
          Aktif (akan auto-tambah transaksi)
        </label>
        <div className="flex gap-2">
          <button onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button onClick={del} className="btn-danger text-sm">
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
    if (!confirm("Hapus budget ini?")) return;
    await deleteBudget(userId, record.id);
    onClose();
  }

  return (
    <Sheet title={record ? "Edit budget" : "Set budget"} onClose={onClose}>
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
          <button onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button onClick={del} className="btn-danger text-sm">
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
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(20px+var(--sab))] slide-up theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
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
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
          Mata uang
        </div>
        <span className="text-[10px] text-text-4">
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
        className="w-full rounded-md bg-bg-elev2 px-3 py-2 text-sm theme-transition"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code} — {c.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[11px] text-text-4">
        Mengubah mata uang akan me-reload halaman supaya semua angka tampil di
        format yang baru.
      </p>
    </section>
  );
}
