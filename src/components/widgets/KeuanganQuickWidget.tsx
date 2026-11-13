"use client";

import { ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useTransactions, addTransaction } from "@/stores/data";
import { hapticTap, hapticSuccess } from "@/lib/haptic";
import { formatRupiahShort } from "@/lib/utils";
import { isoDay } from "@/lib/dates";

const QUICK_INCOME = ["Gaji", "Bonus", "Lainnya"];
const QUICK_EXPENSE = ["Makan", "Transport", "Belanja", "Lainnya"];

function todayISO(): string {
  return isoDay();
}

export function KeuanganQuickWidget() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId) ?? [];
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"in" | "out" | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");

  const totals = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const cutoff = monthStart.getTime();
    let income = 0;
    let expense = 0;
    for (const t of txs) {
      const ts = new Date(t.date).getTime();
      if (ts < cutoff) continue;
      if (t.kind === "in") income += t.amount;
      else if (t.kind === "out") expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [txs]);

  async function save() {
    if (!userId || !mode || !category) return;
    const v = parseFloat(amount);
    if (!Number.isFinite(v) || v <= 0) return;
    hapticTap();
    await addTransaction(userId, {
      kind: mode === "in" ? "in" : "out",
      amount: v,
      category,
      who: "Saya",
      date: todayISO(),
    });
    hapticSuccess();
    setAmount("");
    setCategory("");
    setMode(null);
  }

  const cats = mode === "in" ? QUICK_INCOME : QUICK_EXPENSE;

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wallet size={16} className="text-text-3" />
          <h3 className="text-[13px] font-semibold text-text-1">Keuangan</h3>
        </div>
        <Link
          href="/uang"
          className="inline-flex items-center gap-0.5 text-[12px] font-medium text-text-3 hover:text-text-1"
        >
          Lihat
          <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>

      <div className="mb-3 grid grid-cols-3 divide-x divide-[color:var(--hairline)] rounded-2xl bg-bg-elev1/60 py-2.5">
        <div className="px-2 text-center">
          <div className="text-[11px] font-semibold text-[color:var(--positive)]">
            Masuk
          </div>
          <div className="tabular-nums text-[13px] font-bold text-[color:var(--positive)]">
            {formatRupiahShort(totals.income)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[11px] font-semibold text-[color:var(--negative)]">
            Keluar
          </div>
          <div className="tabular-nums text-[13px] font-bold text-[color:var(--negative)]">
            {formatRupiahShort(totals.expense)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[11px] font-semibold text-text-3">
            Bersih
          </div>
          <div className="tabular-nums text-[13px] font-bold text-text-1">
            {formatRupiahShort(totals.net)}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!mode ? (
          <motion.div
            key="triggers"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              onClick={() => {
                hapticTap();
                setMode("in");
              }}
              className="rounded-xl border border-[color:var(--positive)]/25 bg-positive-bg py-2.5 text-[13px] font-semibold text-[color:var(--positive)] transition-transform active:scale-95"
            >
              + Pemasukan
            </button>
            <button
              type="button"
              onClick={() => {
                hapticTap();
                setMode("out");
              }}
              className="rounded-xl border border-[color:var(--negative)]/25 bg-negative-bg py-2.5 text-[13px] font-semibold text-[color:var(--negative)] transition-transform active:scale-95"
            >
              − Pengeluaran
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="drawer"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
            className="space-y-2.5 rounded-2xl border border-[color:var(--hairline)] bg-bg-elev1/70 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-text-2">
                {mode === "in" ? "Pemasukan baru" : "Pengeluaran baru"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setCategory("");
                }}
                className="text-[12px] font-medium text-text-3 hover:text-text-1"
              >
                Batal
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setCategory(c);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      active
                        ? "border-transparent bg-text-1 text-bg-app"
                        : "border-border bg-bg-card text-text-2"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Rp0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                  if (e.key === "Escape") setMode(null);
                }}
                className="input-base flex-1 font-semibold tabular-nums"
                autoFocus
              />
              <button
                type="button"
                onClick={save}
                disabled={!category || !amount}
                className="rounded-xl bg-accent px-4 text-[13px] font-semibold text-accent-fg transition-transform active:scale-95 disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
