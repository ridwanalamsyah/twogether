import { addDays, fromIsoDay, isoDay } from "@/lib/people";

/**
 * Hijri dates via the browser's built-in Umm al-Qura calendar. Indonesia's
 * official dates (sidang isbat) can differ by a day, so callers pass the
 * user's correction (−1, 0, +1).
 */
export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Syaban",
  "Ramadhan",
  "Syawal",
  "Dzulqaidah",
  "Dzulhijjah",
];

export interface HijriDate {
  day: number;
  month: number; // 1–12
  year: number;
  label: string; // "24 Rabiul Akhir 1448"
}

let fmt: Intl.DateTimeFormat | null = null;

export function toHijri(isoDate: string, offset = 0): HijriDate {
  fmt ??= new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const d = fromIsoDay(addDays(isoDate, -offset));
  const parts = fmt.formatToParts(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const day = get("day");
  const month = get("month");
  const year = get("year");
  return { day, month, year, label: `${day} ${HIJRI_MONTHS[month - 1] ?? ""} ${year}` };
}

export interface IslamicDay {
  date: string;
  hijri: HijriDate;
  title: string;
  emoji: string;
  /** Recommended (sunnah) fast. */
  fast?: boolean;
  /** Major holiday. */
  major?: boolean;
}

const EVENTS: { m: number; d: number; title: string; emoji: string; fast?: boolean; major?: boolean }[] = [
  { m: 1, d: 1, title: "Tahun Baru Islam", emoji: "🌙", major: true },
  { m: 1, d: 9, title: "Puasa Tasu'a", emoji: "🍃", fast: true },
  { m: 1, d: 10, title: "Puasa Asyura", emoji: "🍃", fast: true },
  { m: 3, d: 12, title: "Maulid Nabi ﷺ", emoji: "✨", major: true },
  { m: 7, d: 27, title: "Isra Mi'raj", emoji: "🌌", major: true },
  { m: 8, d: 15, title: "Nisfu Syaban", emoji: "🌕" },
  { m: 9, d: 1, title: "Awal Ramadhan", emoji: "🌙", major: true },
  { m: 9, d: 17, title: "Nuzulul Quran", emoji: "📖" },
  { m: 10, d: 1, title: "Idul Fitri", emoji: "🎉", major: true },
  { m: 12, d: 9, title: "Puasa Arafah", emoji: "🕋", fast: true },
  { m: 12, d: 10, title: "Idul Adha", emoji: "🐑", major: true },
];

/** Islamic days & sunnah fasts from `from` for `days` days. */
export function islamicDays(from: string, days: number, offset = 0): IslamicDay[] {
  const out: IslamicDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(from, i);
    const h = toHijri(date, offset);
    const dow = fromIsoDay(date).getDay();
    for (const e of EVENTS) {
      if (e.m === h.month && e.d === h.day) out.push({ date, hijri: h, ...e });
    }
    const tasyrik = h.month === 12 && h.day >= 11 && h.day <= 13;
    if (h.day >= 13 && h.day <= 15 && h.month !== 9 && !tasyrik) {
      out.push({ date, hijri: h, title: "Ayyamul Bidh", emoji: "🌕", fast: true });
    } else if ((dow === 1 || dow === 4) && h.month !== 9 && !tasyrik && !(h.month === 10 && h.day === 1)) {
      out.push({ date, hijri: h, title: dow === 1 ? "Puasa Senin" : "Puasa Kamis", emoji: "🍃", fast: true });
    }
  }
  return out;
}

/** Gregorian dates of the Ramadhan containing or following `from`. */
export function ramadhanRange(from: string, offset = 0): { start: string; end: string; days: number } | null {
  let start: string | null = null;
  for (let i = 0; i < 400; i += 1) {
    const date = addDays(from, -30 + i);
    const h = toHijri(date, offset);
    if (h.month === 9 && h.day === 1 && (date >= addDays(from, -30))) {
      // Is this the current or next Ramadhan?
      const endGuess = addDays(date, 29);
      if (endGuess >= from || start === null) {
        start = date;
        if (endGuess >= from) break;
      }
    }
  }
  if (!start) return null;
  let days = 0;
  while (toHijri(addDays(start, days), offset).month === 9 && days < 31) days += 1;
  return { start, end: addDays(start, days - 1), days };
}

export function todayHijri(offset = 0): HijriDate {
  return toHijri(isoDay(new Date()), offset);
}
