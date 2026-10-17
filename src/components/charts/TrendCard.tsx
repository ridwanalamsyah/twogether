"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useDeposits, useEntries } from "@/stores/data";
import { isoDay, addDays, fromIsoDay } from "@/lib/people";

/**
 * Health-app style trend: one column per day, the average up top, tap a
 * column to read it. Lives inside the menu the data belongs to (Sehat,
 * Belajar, Goals) instead of a separate charts page.
 */
interface Props {
  /** entries.kind to read, or "deposit" for Goals savings. */
  kind: string;
  title?: string;
  unit: string;
  /** "sum" for amounts per day (water, minutes); "avg" for levels (weight, mood). */
  agg?: "sum" | "avg";
  days?: 7 | 14 | 30;
  format?: (v: number) => string;
  color?: string;
}

export function TrendCard({ kind, title = "Tren", unit, agg = "sum", days: initialDays = 14, format, color = "var(--accent)" }: Props) {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, kind === "deposit" ? "__none__" : kind) ?? [];
  const deposits = useDeposits(userId) ?? [];
  const [days, setDays] = useState<7 | 14 | 30>(initialDays);
  const [pick, setPick] = useState<number | null>(null);

  const series = useMemo(() => {
    const today = isoDay(new Date());
    const dates = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
    const raw = kind === "deposit" ? deposits.map((d) => ({ date: d.date, v: d.amount })) : entries.map((e) => ({ date: e.date, v: e.valueNum ?? 0 }));
    const sums = new Map<string, { s: number; n: number }>();
    for (const r of raw) {
      const cur = sums.get(r.date) ?? { s: 0, n: 0 };
      sums.set(r.date, { s: cur.s + r.v, n: cur.n + 1 });
    }
    return dates.map((d) => {
      const x = sums.get(d);
      return { d, v: x ? (agg === "avg" ? x.s / x.n : x.s) : 0, has: !!x };
    });
  }, [entries, deposits, kind, days, agg]);

  const filled = series.filter((x) => x.has);
  const fmt = format ?? ((v: number) => `${Math.round(v * 10) / 10} ${unit}`);
  const avg = filled.length ? filled.reduce((s, x) => s + x.v, 0) / filled.length : 0;
  const max = Math.max(...series.map((x) => x.v), 0) || 1;
  const min = agg === "avg" && filled.length ? Math.min(...filled.map((x) => x.v)) * 0.9 : 0;
  const shown = pick != null ? series[pick] : null;

  return (
    <div className="surface mt-4 px-4 pb-3 pt-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-text-1">{title}</div>
          <div className="mt-1 text-[12px] text-text-3">
            {shown ? fromIsoDay(shown.d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" }) : agg === "avg" ? "Rata-rata" : "Rata-rata per hari"}
          </div>
          {filled.length || shown ? (
            <div className="num text-[24px] font-semibold text-text-1">{fmt(shown ? shown.v : avg)}</div>
          ) : null}
        </div>
        <div className="flex rounded-[9px] bg-bg-elev2 p-0.5 text-[12px] font-semibold">
          {([7, 14, 30] as const).map((n) => (
            <button
              key={n}
              onClick={() => {
                setDays(n);
                setPick(null);
              }}
              className={`rounded-[7px] px-2.5 py-1 ${days === n ? "bg-bg-card text-text-1 shadow-sm" : "text-text-3"}`}
            >
              {n === 7 ? "M" : n === 14 ? "2M" : "B"}
            </button>
          ))}
        </div>
      </div>
      {filled.length === 0 ? (
        <div className="grid h-24 place-items-center text-[13px] text-text-4">Belum ada catatan di rentang ini</div>
      ) : (
        <div className="mt-3 flex h-24 items-end gap-[3px]" onMouseLeave={() => setPick(null)}>
          {series.map((x, i) => {
            const h = x.has ? Math.max(4, ((x.v - min) / (max - min || 1)) * 100) : 0;
            return (
              <button
                key={x.d}
                onMouseEnter={() => setPick(i)}
                onClick={() => setPick(pick === i ? null : i)}
                aria-label={`${x.d}: ${fmt(x.v)}`}
                className="flex h-full flex-1 items-end"
              >
                <span
                  className={`w-full rounded-[3px] transition-opacity ${pick != null && pick !== i ? "opacity-35" : ""}`}
                  style={{ height: `${h}%`, background: x.has ? color : "transparent" }}
                />
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-1.5 flex justify-between text-[11px] text-text-4">
        <span>{fromIsoDay(series[0].d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
        <span>Hari ini</span>
      </div>
    </div>
  );
}
