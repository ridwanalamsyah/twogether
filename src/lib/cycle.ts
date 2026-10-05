import type { EntryRecord } from "@/lib/db";
import { addDays, daysBetween, isoDay } from "@/lib/people";

export interface CycleSettings {
  /** Used until there are at least two recorded starts. */
  cycleLength: number;
  periodLength: number;
  /** Partner may see the phase card on their Beranda. */
  shareWithPartner: boolean;
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  cycleLength: 28,
  periodLength: 5,
  shareWithPartner: true,
};

export type CyclePhase = "haid" | "subur" | "menjelang" | "tenang" | "belum";

export interface CycleState {
  /** Recorded period ranges (inclusive), newest last. */
  periods: { start: string; end: string; ongoing: boolean }[];
  avgCycle: number;
  lastStart: string | null;
  /** 1-based day of the current cycle. */
  dayOfCycle: number | null;
  nextStart: string | null;
  daysUntilNext: number | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  ovulation: string | null;
  phase: CyclePhase;
  /** True while today falls inside a recorded/assumed period. */
  onPeriod: boolean;
}

/**
 * Turns "start"/"end" markers into periods and simple predictions.
 * Calendar method only: average of recent cycle lengths, ovulation about
 * 14 days before the next period, fertile window = ovulation −5 … +1.
 * This is an estimate, never contraception advice.
 */
export function computeCycle(
  entries: EntryRecord[],
  settings: CycleSettings = DEFAULT_CYCLE_SETTINGS,
  today: string = isoDay(new Date()),
): CycleState {
  const markers = entries
    .filter((e) => e.kind === "cycle" && (e.valueText === "start" || e.valueText === "end"))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const periods: CycleState["periods"] = [];
  for (const m of markers) {
    if (m.valueText === "start") {
      const prev = periods[periods.length - 1];
      // Ignore a duplicate "start" inside a running period.
      if (prev && prev.ongoing && daysBetween(prev.start, m.date) < 10) continue;
      if (prev?.ongoing) {
        prev.ongoing = false;
        prev.end = addDays(prev.start, settings.periodLength - 1);
      }
      periods.push({ start: m.date, end: m.date, ongoing: true });
    } else {
      const open = [...periods].reverse().find((p) => p.ongoing && p.start <= m.date);
      if (open && daysBetween(open.start, m.date) <= 15) {
        open.end = m.date;
        open.ongoing = false;
      }
    }
  }
  // A period with no "end" closes itself after the usual length.
  for (const p of periods) {
    if (!p.ongoing) continue;
    const assumedEnd = addDays(p.start, settings.periodLength - 1);
    if (today > assumedEnd) {
      p.ongoing = false;
      p.end = assumedEnd;
    } else {
      p.end = today < p.start ? p.start : today;
    }
  }

  const starts = periods.map((p) => p.start);
  const diffs: number[] = [];
  for (let i = Math.max(1, starts.length - 6); i < starts.length; i += 1) {
    const d = daysBetween(starts[i - 1], starts[i]);
    if (d >= 18 && d <= 50) diffs.push(d);
  }
  const avgCycle = diffs.length
    ? Math.round(diffs.reduce((s, n) => s + n, 0) / diffs.length)
    : settings.cycleLength;

  const lastStart = starts.length ? starts[starts.length - 1] : null;
  if (!lastStart) {
    return {
      periods,
      avgCycle,
      lastStart: null,
      dayOfCycle: null,
      nextStart: null,
      daysUntilNext: null,
      fertileStart: null,
      fertileEnd: null,
      ovulation: null,
      phase: "belum",
      onPeriod: false,
    };
  }

  // Roll the prediction forward if a period is overdue and unrecorded.
  let nextStart = addDays(lastStart, avgCycle);
  while (daysBetween(today, nextStart) < -avgCycle) nextStart = addDays(nextStart, avgCycle);
  const ovulation = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const daysUntilNext = daysBetween(today, nextStart);
  const dayOfCycle = daysBetween(lastStart, today) + 1;
  const last = periods[periods.length - 1];
  const onPeriod = today >= last.start && today <= last.end;

  let phase: CyclePhase = "tenang";
  if (onPeriod) phase = "haid";
  else if (today >= fertileStart && today <= fertileEnd) phase = "subur";
  else if (daysUntilNext >= 0 && daysUntilNext <= 5) phase = "menjelang";

  return {
    periods,
    avgCycle,
    lastStart,
    dayOfCycle,
    nextStart,
    daysUntilNext,
    fertileStart,
    fertileEnd,
    ovulation,
    phase,
    onPeriod,
  };
}

/** Is `day` inside any recorded period? */
export function isPeriodDay(state: CycleState, day: string): boolean {
  return state.periods.some((p) => day >= p.start && day <= p.end);
}

/** Is `day` inside the next predicted period? */
export function isPredictedDay(state: CycleState, day: string, periodLength: number): boolean {
  if (!state.nextStart) return false;
  return day >= state.nextStart && day <= addDays(state.nextStart, periodLength - 1);
}

export function isFertileDay(state: CycleState, day: string): boolean {
  return !!state.fertileStart && !!state.fertileEnd && day >= state.fertileStart && day <= state.fertileEnd;
}

export const PHASE_COPY: Record<CyclePhase, { label: string; emoji: string; self: string; partner: string }> = {
  haid: {
    label: "Sedang haid",
    emoji: "🌸",
    self: "Istirahat yang cukup, minum air hangat, dan jangan lupa makan.",
    partner: "Tawarkan teh hangat atau kompres, dan maklumi kalau dia butuh istirahat 🤍",
  },
  subur: {
    label: "Perkiraan masa subur",
    emoji: "🌿",
    self: "Energi biasanya sedang bagus-bagusnya.",
    partner: "Biasanya energinya lagi bagus — waktu pas untuk jalan berdua.",
  },
  menjelang: {
    label: "Menjelang haid",
    emoji: "🌙",
    self: "Mood dan badan bisa lebih sensitif. Siapkan pembalut ya.",
    partner: "Mood-nya bisa lebih sensitif beberapa hari ini. Ekstra sabar & perhatian ya.",
  },
  tenang: {
    label: "Fase tenang",
    emoji: "☁️",
    self: "Tidak ada yang perlu disiapkan khusus.",
    partner: "Semua aman. Tetap jadi pasangan yang perhatian 😉",
  },
  belum: {
    label: "Belum ada catatan",
    emoji: "📅",
    self: "Catat hari pertama haid supaya perkiraan mulai jalan.",
    partner: "Belum ada catatan siklus.",
  },
};
