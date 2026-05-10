"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import {
  useHabits,
  useHabitLogsForDate,
  toggleHabitLog,
} from "@/stores/data";
import { hapticTap } from "@/lib/haptic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HabitsQuickWidget() {
  const userId = useAuth((s) => s.userId);
  const habits = useHabits(userId) ?? [];
  const today = todayISO();
  const logs = useHabitLogsForDate(userId, today) ?? [];

  const doneSet = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) if (l.done) s.add(l.habitId);
    return s;
  }, [logs]);

  const visible = habits.slice(0, 5);
  const total = habits.length;
  const done = doneSet.size;

  if (total === 0) {
    return (
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">✅</span>
            <h3 className="text-[13px] font-semibold text-text-1">Habits</h3>
          </div>
          <div className="mt-0.5 text-[11px] text-text-3">
            Belum ada kebiasaan
          </div>
        </div>
        <Link
          href="/habits"
          className="rounded-md bg-text-1 px-3 py-1.5 text-[11px] font-semibold text-bg-app"
        >
          Atur
        </Link>
      </div>
    );
  }

  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">✅</span>
          <h3 className="text-[13px] font-semibold text-text-1">Habits</h3>
          <span className="text-[10px] font-medium text-text-3">
            {done}/{total}
          </span>
        </div>
        <Link href="/habits" className="text-[11px] text-text-3 active:opacity-60">
          Detail ›
        </Link>
      </div>
      <div className="space-y-1">
        {visible.map((h) => {
          const isDone = doneSet.has(h.id);
          return (
            <button
              key={h.id}
              onClick={async () => {
                if (!userId) return;
                hapticTap();
                await toggleHabitLog(userId, h.id, today, "Saya");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg-elev1 px-2.5 py-1.5 text-left active:scale-[0.99]"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-bold transition-colors ${
                  isDone
                    ? "border-text-1 bg-text-1 text-bg-app"
                    : "border-border bg-bg-app text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={`flex-1 truncate text-[12px] ${
                  isDone ? "text-text-3 line-through" : "text-text-1"
                }`}
              >
                {h.label}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-text-4">
                {h.bucket}
              </span>
            </button>
          );
        })}
      </div>
      {total > 5 && (
        <Link
          href="/habits"
          className="mt-2 block rounded-md border border-border py-1.5 text-center text-[11px] font-medium text-text-2 active:bg-bg-elev2"
        >
          + {total - 5} habit lainnya
        </Link>
      )}
    </div>
  );
}
