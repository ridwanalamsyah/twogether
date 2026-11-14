"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { useDeposits, useGoals } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatRupiahShort, clamp } from "@/lib/utils";

export function SavingsProgressWidget() {
  const userId = useAuth((s) => s.userId);
  const goals = useGoals(userId);
  const deposits = useDeposits(userId);
  const reduce = useReducedMotion();

  const items = useMemo(() => {
    return (goals ?? []).map((g) => {
      const saved = (deposits ?? [])
        .filter((d) => d.goalId === g.id)
        .reduce((a, b) => a + b.amount, 0);
      const pct = clamp(g.target ? (saved / g.target) * 100 : 0, 0, 100);
      return { goal: g, saved, pct };
    });
  }, [goals, deposits]);

  return (
    <WidgetShell
      title="Tabungan"
      action={
        <Link
          href="/goals"
          className="-my-2 inline-flex min-h-[44px] items-center gap-0.5 text-[12px] font-medium text-text-3 hover:text-text-1"
        >
          Lihat
          <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="text-[12px] text-text-3">
          Belum ada goal.
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 4).map((it) => (
            <div key={it.goal.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] text-text-1">
                  {it.goal.name}
                </span>
                <span className="tabular-nums text-[12px] font-semibold text-text-3">
                  {Math.round(it.pct)}%
                </span>
              </div>
              <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
                <motion.div
                  className="h-full w-full rounded-full bg-accent"
                  style={{ originX: 0 }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: it.pct / 100 }}
                  transition={reduce ? { duration: 0.1 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-1 tabular-nums text-[12px] text-text-3">
                {formatRupiahShort(it.saved)} / {formatRupiahShort(it.goal.target)}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
