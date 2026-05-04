"use client";

import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useDeposits, useHabitLogsForDate } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { todayISO } from "@/lib/utils";

/**
 * Streak widget: consecutive-day streak of any deposit OR any habit completed.
 * Simple rule — any activity in a day counts as maintaining the streak.
 */
export function StreakWidget() {
  const userId = useAuth((s) => s.userId);
  const deposits = useDeposits(userId);
  const todayLogs = useHabitLogsForDate(userId, todayISO());

  const streak = useMemo(() => {
    const days = new Set<string>();
    for (const d of deposits ?? []) days.add(d.date);
    for (const l of todayLogs ?? []) if (l.done) days.add(l.date);

    let count = 0;
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    // Break if today hasn't been marked yet — still count from yesterday.
    if (!days.has(cur.toISOString().slice(0, 10))) {
      cur.setDate(cur.getDate() - 1);
    }
    while (days.has(cur.toISOString().slice(0, 10))) {
      count += 1;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  }, [deposits, todayLogs]);

  return (
    <WidgetShell title="Streak">
      <div className="flex items-baseline gap-1.5">
        <div className="font-mono text-[28px] font-semibold leading-none tracking-tight text-text-1">
          {streak}
        </div>
        <div className="text-[12px] text-text-3">hari berturut</div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-3">
        {streak === 0
          ? "Catat setoran atau habit untuk memulai."
          : streak < 7
            ? `${7 - streak} hari lagi ke milestone pertama.`
            : streak < 30
              ? "Konsisten. Lanjut ke 30 hari."
              : "Konsistensi luar biasa."}
      </p>
    </WidgetShell>
  );
}
