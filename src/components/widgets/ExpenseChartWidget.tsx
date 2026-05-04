"use client";

import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useTransactions } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatRupiahShort } from "@/lib/utils";

interface DayBucket {
  label: string;
  iso: string;
  amount: number;
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function ExpenseChartWidget() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId);

  const days = useMemo<DayBucket[]>(() => {
    const buckets: DayBucket[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      buckets.push({ label: DAY_LABELS[d.getDay()], iso, amount: 0 });
    }
    for (const t of txs ?? []) {
      if (t.kind !== "out") continue;
      const b = buckets.find((b) => b.iso === t.date);
      if (b) b.amount += t.amount;
    }
    return buckets;
  }, [txs]);

  const max = Math.max(1, ...days.map((d) => d.amount));
  const total = days.reduce((a, b) => a + b.amount, 0);

  return (
    <WidgetShell title="7 hari" action={
      <span className="font-mono text-[11px] tabular-nums text-text-3">
        {formatRupiahShort(total)}
      </span>
    }>
      <div className="flex h-[100px] items-end gap-1.5">
        {days.map((d) => {
          const h = Math.max(2, (d.amount / max) * 100);
          const isToday = d.iso === new Date().toISOString().slice(0, 10);
          return (
            <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end">
                <div
                  className={`w-full rounded-sm transition-all duration-500 ${
                    isToday ? "bg-text-1" : "bg-bg-elev3"
                  }`}
                  style={{ height: `${h}%` }}
                  title={formatRupiahShort(d.amount)}
                />
              </div>
              <span className="text-[10px] text-text-4">{d.label}</span>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
