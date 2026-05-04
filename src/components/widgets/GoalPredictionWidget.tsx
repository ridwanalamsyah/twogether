"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useDeposits, useGoals } from "@/stores/data";
import { predictGoal } from "@/services/prediction";
import { WidgetShell } from "./WidgetShell";
import { formatRupiahShort } from "@/lib/utils";

export function GoalPredictionWidget() {
  const userId = useAuth((s) => s.userId);
  const goals = useGoals(userId);
  const deposits = useDeposits(userId);

  const focus = useMemo(() => {
    const list = goals ?? [];
    if (!list.length) return null;
    // Choose the goal closest to (but below) target as the headline.
    return list
      .map((g) => ({ goal: g, pred: predictGoal(g, deposits ?? []) }))
      .sort((a, b) => {
        const aReached = a.pred.remaining === 0 ? 1 : 0;
        const bReached = b.pred.remaining === 0 ? 1 : 0;
        if (aReached !== bReached) return aReached - bReached;
        return a.pred.weeksLeft - b.pred.weeksLeft;
      })[0];
  }, [goals, deposits]);

  if (!focus) {
    return (
      <WidgetShell title="Prediksi goal">
        <p className="text-sm text-text-3">
          Tambahkan goal & setoran untuk melihat ETA otomatis di sini.
        </p>
      </WidgetShell>
    );
  }

  const { goal, pred } = focus;
  const tone =
    pred.confidence === "tinggi"
      ? "bg-positive-bg text-[color:var(--positive)]"
      : pred.confidence === "sedang"
        ? "bg-info-bg text-[color:var(--info)]"
        : "bg-warning-bg text-[color:var(--warning)]";

  return (
    <WidgetShell
      title="Prediksi"
      action={
        <Link
          href={`/goals?focus=${goal.id}`}
          className="text-[11px] text-text-3 hover:text-text-1"
        >
          Simulasi
        </Link>
      }
    >
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-medium text-text-1">
            {goal.name}
          </span>
          <span className={`flex-shrink-0 text-[10px] uppercase tracking-wider ${tone}`}>
            {pred.confidence}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-text-3">
          {pred.summary}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-x-3 border-t border-border pt-3">
          <Stat
            value={formatRupiahShort(pred.weeklyRate)}
            label="per minggu"
          />
          <Stat value={formatRupiahShort(pred.remaining)} label="sisa" />
          <Stat
            value={`${Math.round(pred.consistency * 100)}%`}
            label="konsisten"
          />
        </div>
      </div>
    </WidgetShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-[12px] font-medium text-text-1">{value}</div>
      <div className="mt-0.5 text-[10px] text-text-4">{label}</div>
    </div>
  );
}
