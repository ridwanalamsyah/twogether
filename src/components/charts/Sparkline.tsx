"use client";

import { useMemo } from "react";

export interface SparklinePoint {
  date: string; // YYYY-MM-DD
  value: number;
}

interface Props {
  points: SparklinePoint[];
  /** Total bucket count (e.g. 30 days). Missing dates plot as 0/skip. */
  bucketCount?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showZeroLine?: boolean;
  formatTick?: (v: number) => string;
}

/** Returns last N days of ISO dates (YYYY-MM-DD) ending today. */
function lastNDates(n: number): string[] {
  const arr: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

export function Sparkline({
  points,
  bucketCount = 30,
  height = 60,
  color = "var(--text-1, #111)",
  fillOpacity = 0.08,
  showZeroLine = false,
  formatTick,
}: Props) {
  const { values, max, min, dates } = useMemo(() => {
    const dates = lastNDates(bucketCount);
    const pmap = new Map<string, number>();
    for (const p of points) {
      pmap.set(p.date, (pmap.get(p.date) ?? 0) + p.value);
    }
    const values = dates.map((d) => pmap.get(d) ?? 0);
    return {
      values,
      max: Math.max(1, ...values),
      min: Math.min(0, ...values),
      dates,
    };
  }, [points, bucketCount]);

  if (values.every((v) => v === 0)) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-text-4"
        style={{ height }}
      >
        Belum ada data
      </div>
    );
  }

  const w = 300;
  const h = height;
  const range = max - min || 1;
  const stepX = w / (values.length - 1 || 1);
  const yOf = (v: number) => h - ((v - min) / range) * h;

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${yOf(v)}`)
    .join(" ");
  const areaPath = `${linePath} L ${(values.length - 1) * stepX} ${h} L 0 ${h} Z`;

  const lastIdx = values.length - 1;
  const lastVal = values[lastIdx];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
      >
        <path d={areaPath} fill={color} fillOpacity={fillOpacity} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={lastIdx * stepX} cy={yOf(lastVal)} r={2.5} fill={color} />
        {showZeroLine && min < 0 && (
          <line x1={0} y1={yOf(0)} x2={w} y2={yOf(0)} stroke={color} strokeOpacity={0.2} strokeDasharray="2 2" />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-text-4">
        <span>{dates[0].slice(5)}</span>
        <span>
          {formatTick ? formatTick(lastVal) : `Hari ini ${lastVal}`}
        </span>
        <span>{dates[lastIdx].slice(5)}</span>
      </div>
    </div>
  );
}
