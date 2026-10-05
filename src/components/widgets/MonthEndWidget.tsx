"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/stores/auth";
import { addDeposit, upsertEntry, useEntries, useGoals, useTransactions } from "@/stores/data";
import { usePeople, isoDay, fromIsoDay } from "@/lib/people";
import { shiftMonthKey } from "@/lib/bills";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";

/**
 * First week of a new month: "Last month you had Rp X left — save it?"
 * Shows nothing otherwise. Either choice is remembered for both phones
 * (entry kind "month-close", valueText = the month).
 */
export function MonthEndWidget() {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const txs = useTransactions(userId);
  const goals = useGoals(userId);
  const closes = useEntries(userId, "month-close");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const today = new Date();
  if (!userId || !txs || !goals || !closes || today.getDate() > 7) return null;
  const month = shiftMonthKey(isoDay(today).slice(0, 7), -1);
  if (closes.some((c) => c.valueText === month)) return null;
  const inMonth = txs.filter((t) => t.date.startsWith(month));
  if (inMonth.length < 3) return null;
  const surplus = inMonth.reduce((s, t) => s + (t.kind === "in" ? t.amount : -t.amount), 0);
  if (surplus <= 0) return null;

  const name = fromIsoDay(`${month}-01`).toLocaleDateString("id-ID", { month: "long" });
  const value = amount ?? surplus;
  const target = goalId ?? goals[0]?.id ?? null;

  async function close(saved: boolean) {
    if (!userId) return;
    setBusy(true);
    if (saved && target && value > 0) {
      await addDeposit(userId, { goalId: target, amount: value, who: me, note: `Sisa ${name}`, date: isoDay(new Date()) });
      hapticSuccess();
      konfetti();
    }
    await upsertEntry(userId, {
      kind: "month-close",
      date: isoDay(new Date()),
      who: me,
      valueText: month,
      valueNum: saved ? value : 0,
      payload: JSON.stringify({ goalId: saved ? target : null, surplus }),
    });
    setBusy(false);
  }

  return (
    <div className="surface p-4">
      <div className="text-[12px] font-semibold text-text-3">Tutup buku {name}</div>
      <div className="mt-0.5 text-[17px] font-extrabold leading-snug text-text-1">
        Bulan lalu sisa {formatRupiahShort(surplus)} 🎉
      </div>
      {goals.length === 0 ? (
        <Link href="/goals" className="mt-2 block text-[13px] font-semibold text-accent">
          Buat tujuan tabungan dulu, lalu sisihkan sisanya →
        </Link>
      ) : (
        <>
          <p className="mt-0.5 text-[13px] text-text-3">Mau langsung ditabung?</p>
          <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoalId(g.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${target === g.id ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-2"}`}
              >
                {g.emoji ?? "🎯"} {g.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {[0.5, 1].map((f) => (
              <button
                key={f}
                onClick={() => setAmount(Math.round((surplus * f) / 1000) * 1000)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${value === Math.round((surplus * f) / 1000) * 1000 || (f === 1 && value === surplus) ? "bg-text-1 text-bg-app" : "bg-bg-elev2 text-text-2"}`}
              >
                {f === 1 ? "Semua" : "Setengah"}
              </button>
            ))}
            <span className="ml-auto self-center font-mono text-[14px] font-bold text-text-1">{formatRupiah(value)}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => close(false)} disabled={busy} className="rounded-full bg-bg-elev2 px-4 py-2.5 text-[13px] font-semibold text-text-2">
              Nanti saja
            </button>
            <button onClick={() => close(true)} disabled={busy || !target} className="btn-accent flex-1 disabled:opacity-50">
              Tabung
            </button>
          </div>
        </>
      )}
    </div>
  );
}
