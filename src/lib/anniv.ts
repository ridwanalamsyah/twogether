import type { ItemRecord } from "@/lib/db";
import { daysBetween, fromIsoDay, isoDay } from "@/lib/dates";

/**
 * The date a couple counts "together since" from, among their anniversary
 * items: prefer jadian/anniversary/nikah, never a birthday (counting from a
 * partner's birth date produced nonsense like 9.907 hari).
 */
export function relationshipStart(annivs: Pick<ItemRecord, "date" | "title">[]): string | null {
  const withDate = annivs.filter((a) => !!a.date);
  if (!withDate.length) return null;
  const isBirthday = (t: string) => /ultah|ulang tahun|birthday|lahir/i.test(t);
  const isRelationship = (t: string) => /jadian|anniv|pacaran|nikah|menikah|bersama|kenal/i.test(t);
  const rel = withDate.filter((a) => isRelationship(a.title ?? ""));
  const nonBirthday = withDate.filter((a) => !isBirthday(a.title ?? ""));
  const pool = rel.length ? rel : nonBirthday.length ? nonBirthday : withDate;
  return pool.reduce((earliest, cur) => (!earliest || cur.date! < earliest.date! ? cur : earliest)).date!;
}

/** Counted from local midnight of the start day, like the calendar. */
export function daysTogether(start: string, now = Date.now()): number {
  return Math.floor(Math.max(0, now - fromIsoDay(start.slice(0, 10)).getTime()) / 86_400_000);
}

/** Is today the relationship's anniversary, or a round 100th day? */
export function celebrationToday(start: string | null, today = isoDay()): { kind: "anniv"; years: number } | { kind: "milestone"; days: number } | null {
  if (!start) return null;
  const s = start.slice(0, 10);
  const years = Number(today.slice(0, 4)) - Number(s.slice(0, 4));
  if (years > 0 && today.slice(5) === s.slice(5)) return { kind: "anniv", years };
  const days = daysBetween(s, today);
  if (days > 0 && days % 100 === 0) return { kind: "milestone", days };
  return null;
}


/** Whole years and months since the start, by the calendar (not days / 365). */
export function yearsMonths(start: string, now = new Date()): { years: number; months: number } {
  const s = fromIsoDay(start.slice(0, 10));
  let months = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() < s.getDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}
