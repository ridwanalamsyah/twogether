"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useTransactions } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { isoDay } from "@/lib/dates";
import { hapticTap } from "@/lib/haptic";

interface DayBucket {
  label: string;
  iso: string;
  amount: number;
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function ExpenseChartWidget() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId);
  const reduce = useReducedMotion();
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const days = useMemo<DayBucket[]>(() => {
    const buckets: DayBucket[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = isoDay(d);
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
  const activeDay = selectedIso ? days.find((d) => d.iso === selectedIso) : null;
  const todayIso = isoDay();

  return (
    <WidgetShell
      title={activeDay ? `${activeDay.label} (${activeDay.iso.slice(8)}/${activeDay.iso.slice(5, 7)})` : "7 hari"}
      action={
        <span className="tabular-nums text-[12px] font-semibold text-text-3">
          {activeDay ? formatRupiah(activeDay.amount) : formatRupiahShort(total)}
        </span>
      }
    >
      <div className="flex h-[108px] items-end gap-1.5">
        {days.map((d, idx) => {
          const pct = Math.max(4, Math.round((d.amount / max) * 100));
          const isToday = d.iso === todayIso;
          const isSelected = d.iso === selectedIso;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => {
                hapticTap();
                setSelectedIso((cur) => (cur === d.iso ? null : d.iso));
              }}
              aria-pressed={isSelected}
              aria-label={`${d.label}: ${formatRupiah(d.amount)}`}
              className="group flex h-full flex-1 flex-col items-center gap-1.5 rounded-lg py-0.5"
            >
              <div className="flex w-full flex-1 items-end px-0.5">
                <motion.div
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={
                    reduce
                      ? { duration: 0.1 }
                      : { type: "spring", stiffness: 380, damping: 30, delay: idx * 0.025 }
                  }
                  style={{ height: `${pct}%`, originY: 1 }}
                  className={`w-full rounded-md transition-colors duration-150 ${
                    isSelected
                      ? "bg-accent"
                      : isToday && !selectedIso
                        ? "bg-text-1"
                        : "bg-bg-elev3 group-hover:bg-text-4"
                  }`}
                />
              </div>
              <span
                className={`text-[12px] font-medium ${
                  isSelected || (isToday && !selectedIso) ? "font-semibold text-text-1" : "text-text-4"
                }`}
              >
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
    </WidgetShell>
  );
}
