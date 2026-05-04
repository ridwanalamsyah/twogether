"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useDeposits, useGoals } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatRupiahShort, clamp } from "@/lib/utils";

export function SavingsProgressWidget() {
  const userId = useAuth((s) => s.userId);
  const goals = useGoals(userId);
  const deposits = useDeposits(userId);

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
          className="text-[11px] text-text-3 hover:text-text-1"
        >
          Detail
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
                <span className="font-mono text-[11px] tabular-nums text-text-3">
                  {Math.round(it.pct)}%
                </span>
              </div>
              <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700"
                  style={{ width: `${it.pct}%` }}
                />
              </div>
              <div className="mt-1 font-mono text-[10px] text-text-4">
                {formatRupiahShort(it.saved)} / {formatRupiahShort(it.goal.target)}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[52px] w-[52px] flex-shrink-0">
      <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--bg-elev3)" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
    </div>
  );
}
