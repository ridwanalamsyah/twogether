"use client";

import { useMemo, useState } from "react";
import type { DepositRecord, GoalRecord } from "@/lib/db";
import { predictGoal } from "@/services/prediction";
import { formatRupiahShort } from "@/lib/utils";

const PRESETS = [0, 100_000, 250_000, 500_000, 1_000_000];

/**
 * What-if simulator. The user adds an "extra/week" amount and the panel
 * recomputes the ETA in real time. Backed by `predictGoal` so the same
 * prediction logic powers the headline summary and the simulator.
 */
export function GoalSimulator({
  goal,
  deposits,
}: {
  goal: GoalRecord;
  deposits: DepositRecord[];
}) {
  const [extra, setExtra] = useState(0);

  const baseline = useMemo(() => predictGoal(goal, deposits), [goal, deposits]);
  const projected = useMemo(
    () => predictGoal(goal, deposits, { extraPerWeek: extra }),
    [goal, deposits, extra],
  );

  const baseWeeks = baseline.weeksLeft;
  const newWeeks = projected.weeksLeft;
  const saved =
    Number.isFinite(baseWeeks) && Number.isFinite(newWeeks)
      ? Math.max(0, baseWeeks - newWeeks)
      : null;

  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
          What-if simulator
        </div>
        <span className="font-mono text-xs text-text-3">
          +{formatRupiahShort(extra)}/minggu
        </span>
      </div>

      <p className="text-sm leading-relaxed text-text-2">
        {projected.summary}
      </p>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={2_000_000}
          step={50_000}
          value={extra}
          onChange={(e) => setExtra(parseInt(e.target.value, 10))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setExtra(p)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                extra === p
                  ? "bg-accent text-accent-fg"
                  : "bg-bg-elev2 text-text-3"
              }`}
            >
              +{formatRupiahShort(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-bg-elev2 p-2.5 theme-transition">
          <div className="text-[10px] uppercase tracking-wider text-text-3">
            Saat ini
          </div>
          <div className="font-mono text-sm font-bold text-text-1">
            {fmtWeeks(baseWeeks)}
          </div>
        </div>
        <div className="rounded-md bg-accent-soft p-2.5 theme-transition">
          <div className="text-[10px] uppercase tracking-wider text-accent">
            Proyeksi
          </div>
          <div className="font-mono text-sm font-bold text-accent">
            {fmtWeeks(newWeeks)}
          </div>
        </div>
      </div>

      {saved && saved >= 1 && (
        <p className="mt-2 text-xs text-[color:var(--positive)]">
          🎉 Lebih cepat ~{Math.round(saved)} minggu
        </p>
      )}
    </div>
  );
}

function fmtWeeks(w: number): string {
  if (!Number.isFinite(w)) return "—";
  if (w < 1) return "tercapai";
  const months = w / 4.345;
  if (months < 1.2) return `${Math.round(w)} mgg`;
  if (months < 18) return `${Math.round(months)} bln`;
  return `${(months / 12).toFixed(1)} thn`;
}
