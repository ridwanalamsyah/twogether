import type { DepositRecord, GoalRecord } from "@/lib/db";
import { mean, stdev } from "@/lib/utils";

/**
 * Lightweight goal-prediction analytics.
 *
 * Approach (no ML, no heavy deps):
 *  1. Bucket deposits by ISO week.
 *  2. Apply a simple moving average (SMA) over the last N weeks of activity.
 *  3. Use linear-trend slope (least squares) to detect whether the user is
 *     accelerating or decelerating their savings.
 *  4. Combine the SMA with a trend-adjusted projection to estimate ETA in
 *     weeks: `weeksLeft = remaining / max(weeklyRate, ε)`.
 *  5. Provide what-if simulation by accepting `extraPerWeek` and re-running.
 *
 * Outputs are plain numbers + a humanized Indonesian description so the UI
 * can render either or both.
 */

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const SMA_WINDOW = 8; // weeks

export interface PredictionResult {
  /** Current weekly savings rate (Rp/week), smoothed. */
  weeklyRate: number;
  /** Slope from linear regression (Rp/week change per week). */
  trend: number;
  /** Consistency 0..1 — higher = more predictable deposits. */
  consistency: number;
  /** Cumulative saved across all deposits in scope. */
  saved: number;
  /** Remaining toward target. Negative if already over. */
  remaining: number;
  /** Estimated weeks until goal hits target. Infinity if unreachable. */
  weeksLeft: number;
  /** Estimated date string (locale id-ID) or null if unreachable. */
  etaDate: string | null;
  /** Human-readable Indonesian summary. */
  summary: string;
  /** Confidence label derived from consistency + sample size. */
  confidence: "rendah" | "sedang" | "tinggi";
}

export interface WhatIfInput {
  extraPerWeek?: number;
  /** Override the smoothed weekly rate instead of adding to it. */
  overrideRate?: number;
}

export function predictGoal(
  goal: GoalRecord,
  deposits: DepositRecord[],
  whatIf: WhatIfInput = {},
): PredictionResult {
  const relevant = deposits
    .filter((d) => d.goalId === goal.id && !d.deletedAt)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const saved = relevant.reduce((sum, d) => sum + d.amount, 0);
  const remaining = Math.max(goal.target - saved, 0);

  if (!relevant.length) {
    return {
      weeklyRate: 0,
      trend: 0,
      consistency: 0,
      saved,
      remaining,
      weeksLeft: Infinity,
      etaDate: null,
      summary:
        "Belum ada riwayat setoran. Mulai setoran pertama untuk mendapat estimasi.",
      confidence: "rendah",
    };
  }

  const weekly = bucketWeekly(relevant);
  const recent = weekly.slice(-SMA_WINDOW);
  const sma = mean(recent.map((w) => w.amount));
  const trend = linearSlope(recent.map((w) => w.amount));
  const cv = consistencyScore(recent.map((w) => w.amount));

  const baseRate = whatIf.overrideRate ?? sma;
  const effectiveRate = Math.max(0, baseRate + (whatIf.extraPerWeek ?? 0));

  const weeksLeft =
    remaining === 0 ? 0 : effectiveRate <= 0 ? Infinity : remaining / effectiveRate;

  const etaDate =
    weeksLeft === Infinity || !Number.isFinite(weeksLeft)
      ? null
      : new Date(Date.now() + weeksLeft * MS_WEEK).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const confidence: PredictionResult["confidence"] =
    recent.length >= 6 && cv >= 0.7
      ? "tinggi"
      : recent.length >= 3 && cv >= 0.4
        ? "sedang"
        : "rendah";

  return {
    weeklyRate: effectiveRate,
    trend,
    consistency: cv,
    saved,
    remaining,
    weeksLeft,
    etaDate,
    summary: buildSummary({
      remaining,
      effectiveRate,
      weeksLeft,
      etaDate,
      trend,
      goalName: goal.name,
    }),
    confidence,
  };
}

interface SummaryArgs {
  remaining: number;
  effectiveRate: number;
  weeksLeft: number;
  etaDate: string | null;
  trend: number;
  goalName: string;
}

function buildSummary(a: SummaryArgs): string {
  if (a.remaining === 0) return `Target ${a.goalName} sudah tercapai 🎉`;
  if (a.effectiveRate <= 0) {
    return `Belum ada setoran konsisten. Mulai setoran rutin untuk mencapai ${a.goalName}.`;
  }
  const months = a.weeksLeft / 4.345;
  const human =
    months < 1.2
      ? `${Math.max(1, Math.round(a.weeksLeft))} minggu`
      : months < 18
        ? `${Math.round(months)} bulan`
        : `${(months / 12).toFixed(1)} tahun`;

  const direction =
    a.trend > a.effectiveRate * 0.05
      ? " (tren naik 📈)"
      : a.trend < -a.effectiveRate * 0.05
        ? " (tren turun 📉)"
        : "";

  const dateSuffix = a.etaDate ? ` — sekitar ${a.etaDate}` : "";
  return `Estimasi tercapai dalam ${human}${direction} jika konsisten seperti sekarang${dateSuffix}.`;
}

interface WeeklyBucket {
  weekStart: number;
  amount: number;
}

function bucketWeekly(deposits: DepositRecord[]): WeeklyBucket[] {
  if (!deposits.length) return [];
  const startTs = +new Date(deposits[0].date);
  const endTs = Date.now();
  const buckets = new Map<number, number>();

  for (let t = startTs; t <= endTs; t += MS_WEEK) {
    buckets.set(weekFloor(t), 0);
  }
  for (const d of deposits) {
    const w = weekFloor(+new Date(d.date));
    buckets.set(w, (buckets.get(w) ?? 0) + d.amount);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekStart, amount]) => ({ weekStart, amount }));
}

function weekFloor(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay(); // 0=Sun
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function linearSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const xs = ys.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Consistency = 1 - (coefficient of variation, clamped).
 * High value (~1) means deposits are stable; low (~0) means erratic.
 */
function consistencyScore(values: number[]): number {
  const m = mean(values);
  if (m <= 0) return 0;
  const cv = stdev(values) / m;
  return Math.max(0, Math.min(1, 1 - cv));
}
