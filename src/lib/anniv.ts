import type { ItemRecord } from "@/lib/db";

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

export function daysTogether(start: string, now = Date.now()): number {
  return Math.floor(Math.max(0, now - new Date(start).getTime()) / 86_400_000);
}
