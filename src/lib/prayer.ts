import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla } from "adhan";

export type PrayerId = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";

export const PRAYERS: { id: PrayerId; name: string; emoji: string }[] = [
  { id: "subuh", name: "Subuh", emoji: "🌅" },
  { id: "dzuhur", name: "Dzuhur", emoji: "☀️" },
  { id: "ashar", name: "Ashar", emoji: "🌤️" },
  { id: "maghrib", name: "Maghrib", emoji: "🌇" },
  { id: "isya", name: "Isya", emoji: "🌙" },
];

export interface DayTimes {
  subuh: Date;
  terbit: Date;
  dzuhur: Date;
  ashar: Date;
  maghrib: Date;
  isya: Date;
}

/**
 * Prayer times computed on the device (works offline). Uses the
 * 20°/18° angles used by Kemenag RI with a 2-minute ihtiyat, Shafi'i asr.
 * Can differ by a minute or two from a local mosque's schedule.
 */
export function prayerTimes(lat: number, lng: number, date = new Date()): DayTimes {
  const params = CalculationMethod.Singapore(); // Fajr 20°, Isha 18°
  params.madhab = Madhab.Shafi;
  params.adjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 };
  const pt = new PrayerTimes(new Coordinates(lat, lng), date, params);
  return {
    subuh: pt.fajr,
    terbit: pt.sunrise,
    dzuhur: pt.dhuhr,
    ashar: pt.asr,
    maghrib: pt.maghrib,
    isya: pt.isha,
  };
}

/** Degrees clockwise from true north towards the Ka'bah. */
export function qiblaBearing(lat: number, lng: number): number {
  return Qibla(new Coordinates(lat, lng));
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
}

/** The next prayer from `now` (rolls over to tomorrow's Subuh). */
export function nextPrayer(
  lat: number,
  lng: number,
  now = new Date(),
): { id: PrayerId; name: string; at: Date } {
  const t = prayerTimes(lat, lng, now);
  for (const p of PRAYERS) {
    if (t[p.id] > now) return { id: p.id, name: p.name, at: t[p.id] };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { id: "subuh", name: "Subuh", at: prayerTimes(lat, lng, tomorrow).subuh };
}
