/**
 * Calendar-day helpers in the phone's local time (WIB for most users).
 *
 * Never use `toISOString().slice(0, 10)` for a day: it's the UTC date, so in
 * WIB anything between 00:00 and 06:59 lands on yesterday, and a Date set to
 * local midnight always reads as the day before. Dependency-free so services
 * and stores can import it without cycles.
 */

/** Local YYYY-MM-DD for a Date. */
export function isoDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse YYYY-MM-DD as local midnight (`new Date(s)` would read it as UTC). */
export function fromIsoDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, n: number): string {
  const d = fromIsoDay(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromIsoDay(b).getTime() - fromIsoDay(a).getTime()) / 86_400_000);
}
