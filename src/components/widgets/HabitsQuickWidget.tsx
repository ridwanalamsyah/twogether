"use client";

import { Check, ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import {
  useHabits,
  useHabitLogsForDate,
  toggleHabitLog,
} from "@/stores/data";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";
import { motion, useReducedMotion } from "framer-motion";
import { isoDay } from "@/lib/dates";

function todayISO(): string {
  return isoDay();
}

export function HabitsQuickWidget() {
  const userId = useAuth((s) => s.userId);
  const reduce = useReducedMotion();
  const habits = useHabits(userId) ?? [];
  const today = todayISO();
  const logs = useHabitLogsForDate(userId, today) ?? [];

  const doneSet = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) if (l.done) s.add(l.habitId);
    return s;
  }, [logs]);

  const visible = habits.slice(0, 3);
  const total = habits.length;
  const done = doneSet.size;

  if (total === 0) {
    return (
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-1.5">
            <CircleCheck size={17} className="text-text-3" aria-hidden />
            <h3 className="text-[13px] font-semibold text-text-1">Kebiasaan</h3>
          </div>
          <div className="mt-0.5 text-[12px] text-text-3">
            Belum ada kebiasaan
          </div>
        </div>
        <Link
          href="/habits"
          className="inline-flex min-h-[44px] items-center rounded-full bg-text-1 px-4 text-[12px] font-semibold text-bg-app"
        >
          Atur
        </Link>
      </div>
    );
  }

  return (
    <div className="surface p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CircleCheck size={17} className="text-text-3" aria-hidden />
          <h3 className="text-[13px] font-semibold text-text-1">Kebiasaan</h3>
          <span className="text-[12px] font-medium tabular-nums text-text-3">
            {done}/{total}
          </span>
        </div>
        <Link
          href="/habits"
          className="inline-flex min-h-[44px] items-center gap-0.5 px-1 text-[12px] font-medium text-text-3 active:opacity-60"
        >
          Lihat
          <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
      <div className="divide-y divide-[color:var(--hairline)]">
        {visible.map((h) => {
          const isDone = doneSet.has(h.id);
          return (
            <button
              key={h.id}
              type="button"
              aria-pressed={isDone}
              onClick={async (e) => {
                if (!userId) return;
                hapticTap();
                // Ticking off the last one of the day earns a small party.
                const finishing = !isDone && done === total - 1;
                const r = e.currentTarget.getBoundingClientRect();
                await toggleHabitLog(userId, h.id, today, "Saya");
                if (finishing) {
                  hapticSuccess();
                  konfetti({ count: 40, origin: { x: r.left + 24, y: r.top + r.height / 2 } });
                }
              }}
              className="flex min-h-[44px] w-full items-center gap-3 py-2 text-left active:opacity-70"
            >
              <motion.span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 ${
                  isDone
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border-strong text-transparent"
                }`}
                animate={reduce ? undefined : { scale: isDone ? [1, 1.28, 0.94, 1] : 1 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                whileTap={reduce ? undefined : { scale: 0.85 }}
              >
                <motion.span
                  className="grid place-items-center"
                  initial={false}
                  animate={reduce ? { scale: isDone ? 1 : 0 } : { scale: isDone ? 1 : 0, rotate: isDone ? 0 : -45 }}
                  transition={reduce ? { duration: 0.08 } : { type: "spring", stiffness: 600, damping: 20 }}
                >
                  <Check size={14} strokeWidth={3} aria-hidden />
                </motion.span>
              </motion.span>
              <span
                className={`min-w-0 flex-1 text-[14px] transition-colors duration-300 ${
                  isDone ? "text-text-3" : "text-text-1"
                }`}
              >
                <span className="relative inline-block max-w-full align-middle">
                  <span className="block truncate">{h.label}</span>
                  {/* Strike line draws across instead of snapping on. */}
                  <motion.span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-[1.5px] w-full rounded-full bg-text-3"
                    style={{ originX: 0 }}
                    initial={false}
                    animate={{ scaleX: isDone ? 1 : 0 }}
                    transition={reduce ? { duration: 0.08 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-4">
                {h.bucket}
              </span>
            </button>
          );
        })}
      </div>
      {total > 3 && (
        <Link
          href="/habits"
          className="mt-1 flex min-h-[44px] items-center justify-center gap-0.5 text-[12px] font-medium text-text-3 active:opacity-60"
        >
          Lihat {total - 3} lainnya
          <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
        </Link>
      )}
    </div>
  );
}
