"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useTransactions, addTransaction } from "@/stores/data";
import { hapticTap, hapticSuccess } from "@/lib/haptic";
import { useStableArray } from "@/lib/useStableArray";

const QUICK_INCOME = ["Gaji", "Bonus", "Lainnya"];
const QUICK_EXPENSE = ["Makan", "Transport", "Belanja", "Lainnya"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatRupiahShort(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `Rp${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} jt`;
  if (Math.abs(n) >= 1_000)
    return `Rp${(n / 1_000).toFixed(0)}rb`;
  return `Rp${n.toLocaleString("id-ID")}`;
}

export function KeuanganQuickWidget() {
  const userId = useAuth((s) => s.userId);
  const txs = useStableArray(useTransactions(userId));
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
          <span className="text-base">💰</span>
          <h3 className="text-[13px] font-semibold text-text-1">Keuangan</h3>
        </div>
        <Link href="/uang" className="text-[11px] text-text-3 active:opacity-60">
          Detail ›
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
          <div className="text-[9px] font-medium uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400">
            Masuk
          </div>
          <div className="font-mono text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
            {formatRupiahShort(totals.income)}
          </div>
        </div>
        <div className="rounded-lg bg-rose-500/10 p-2 text-center">
          <div className="text-[9px] font-medium uppercase tracking-wider text-rose-700/80 dark:text-rose-400">
            Keluar
          </div>
          <div className="font-mono text-[12px] font-bold text-rose-700 dark:text-rose-300">
            {formatRupiahShort(totals.expense)}
          </div>
        </div>
        <div className="rounded-lg bg-bg-elev1 p-2 text-center">
          <div className="text-[9px] font-medium uppercase tracking-wider text-text-3">
            Net
          </div>
          <div className="font-mono text-[12px] font-bold text-text-1">
            {formatRupiahShort(totals.net)}
          </div>
        </div>
      </div>

      {!mode ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              hapticTap();
              setMode("in");
            }}
            className="rounded-md bg-emerald-500 py-2 text-[12px] font-semibold text-white active:scale-95"
          >
            + Pemasukan
          </button>
          <button
            onClick={() => {
              hapticTap();
              setMode("out");
            }}
            className="rounded-md bg-rose-500 py-2 text-[12px] font-semibold text-white active:scale-95"
          >
            − Pengeluaran
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-border bg-bg-elev1 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-text-2">
              {mode === "in" ? "Pemasukan baru" : "Pengeluaran baru"}
            </span>
            <button
              onClick={() => setMode(null)}
              className="text-[11px] text-text-3 active:opacity-60"
            >
              Batal
            </button>
          </div>
          <div className="flex gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
                  category === c
                    ? "border-text-1 bg-bg-elev2 text-text-1"
                    : "border-border bg-bg-app text-text-3"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Rp"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-base flex-1 font-mono text-sm"
              autoFocus
            />
            <button
              onClick={save}
              disabled={!category || !amount}
              className={`rounded-md px-3 text-[12px] font-semibold text-white disabled:opacity-50 ${
                mode === "in" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            >
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
