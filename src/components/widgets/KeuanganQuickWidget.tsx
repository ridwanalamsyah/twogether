"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
        <Link href="/uang" className="text-[11px] text-text-3 active:opacity-60">
          Lihat ›
        </Link>
      </div>

      <div className="mb-3 grid grid-cols-3 divide-x divide-[color:var(--hairline)] rounded-2xl bg-bg-elev1/50 py-2.5">
        <div className="px-2 text-center">
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            Masuk
          </div>
          <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatRupiahShort(totals.income)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Keluar
          </div>
          <div className="text-[13px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatRupiahShort(totals.expense)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[10px] font-semibold text-text-3">
            Bersih
          </div>
          <div className="text-[13px] font-bold text-text-1 tabular-nums">
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
            className="pressable rounded-xl bg-emerald-600 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            + Pemasukan
          </button>
          <button
            onClick={() => {
              hapticTap();
              setMode("out");
            }}
            className="pressable rounded-xl bg-rose-600 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-rose-500"
          >
            − Pengeluaran
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-[color:var(--hairline)] bg-bg-elev1/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text-2">
              {mode === "in" ? "Pemasukan baru" : "Pengeluaran baru"}
            </span>
            <button
              onClick={() => setMode(null)}
              className="pressable text-[11px] font-medium text-text-3 hover:text-text-1"
            >
              Batal
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`pressable rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  category === c
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-bg-card text-text-2"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Rp 0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-base flex-1 text-sm font-semibold tabular-nums"
              autoFocus
            />
            <button
              onClick={save}
              disabled={!category || !amount}
              className={`pressable rounded-xl px-4 text-[12px] font-semibold text-white disabled:opacity-40 ${
                mode === "in" ? "bg-emerald-600" : "bg-rose-600"
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
