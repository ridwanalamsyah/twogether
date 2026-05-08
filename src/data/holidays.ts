/**
 * Hari libur nasional Indonesia 2026.
 * Sumber: Kalender Nasional Republik Indonesia (perkiraan, dapat berubah
 * mengikuti SKB 3 Menteri).
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: "libur" | "cuti-bersama";
}

export const HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01", name: "Tahun Baru Masehi", type: "libur" },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577", type: "libur" },
  { date: "2026-03-19", name: "Isra Mi'raj Nabi Muhammad SAW", type: "libur" },
  { date: "2026-03-20", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)", type: "libur" },
  { date: "2026-03-21", name: "Cuti Bersama Nyepi", type: "cuti-bersama" },
  { date: "2026-04-03", name: "Wafat Isa Almasih", type: "libur" },
  { date: "2026-04-19", name: "Hari Raya Idul Fitri 1447 H", type: "libur" },
  { date: "2026-04-20", name: "Hari Raya Idul Fitri 1447 H", type: "libur" },
  { date: "2026-04-16", name: "Cuti Bersama Idul Fitri", type: "cuti-bersama" },
  { date: "2026-04-17", name: "Cuti Bersama Idul Fitri", type: "cuti-bersama" },
  { date: "2026-04-21", name: "Cuti Bersama Idul Fitri", type: "cuti-bersama" },
  { date: "2026-04-22", name: "Cuti Bersama Idul Fitri", type: "cuti-bersama" },
  { date: "2026-05-01", name: "Hari Buruh Internasional", type: "libur" },
  { date: "2026-05-14", name: "Kenaikan Isa Almasih", type: "libur" },
  { date: "2026-05-15", name: "Cuti Bersama Kenaikan Isa Almasih", type: "cuti-bersama" },
  { date: "2026-05-21", name: "Hari Raya Waisak 2570", type: "libur" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila", type: "libur" },
  { date: "2026-06-26", name: "Hari Raya Idul Adha 1447 H", type: "libur" },
  { date: "2026-07-17", name: "Tahun Baru Islam 1448 H", type: "libur" },
  { date: "2026-08-17", name: "Hari Kemerdekaan Republik Indonesia", type: "libur" },
  { date: "2026-09-25", name: "Maulid Nabi Muhammad SAW", type: "libur" },
  { date: "2026-12-25", name: "Hari Raya Natal", type: "libur" },
  { date: "2026-12-24", name: "Cuti Bersama Natal", type: "cuti-bersama" },
];

export const HOLIDAYS_2027: Holiday[] = [
  { date: "2027-01-01", name: "Tahun Baru Masehi", type: "libur" },
  { date: "2027-02-06", name: "Tahun Baru Imlek 2578", type: "libur" },
  { date: "2027-03-09", name: "Isra Mi'raj Nabi Muhammad SAW", type: "libur" },
  { date: "2027-03-10", name: "Hari Suci Nyepi (Tahun Baru Saka 1949)", type: "libur" },
  { date: "2027-03-26", name: "Wafat Isa Almasih", type: "libur" },
  { date: "2027-04-08", name: "Hari Raya Idul Fitri 1448 H", type: "libur" },
  { date: "2027-04-09", name: "Hari Raya Idul Fitri 1448 H", type: "libur" },
  { date: "2027-05-01", name: "Hari Buruh Internasional", type: "libur" },
  { date: "2027-05-06", name: "Kenaikan Isa Almasih", type: "libur" },
  { date: "2027-05-11", name: "Hari Raya Waisak 2571", type: "libur" },
  { date: "2027-06-01", name: "Hari Lahir Pancasila", type: "libur" },
  { date: "2027-06-16", name: "Hari Raya Idul Adha 1448 H", type: "libur" },
  { date: "2027-07-06", name: "Tahun Baru Islam 1449 H", type: "libur" },
  { date: "2027-08-17", name: "Hari Kemerdekaan Republik Indonesia", type: "libur" },
  { date: "2027-09-14", name: "Maulid Nabi Muhammad SAW", type: "libur" },
  { date: "2027-12-25", name: "Hari Raya Natal", type: "libur" },
];

export const ALL_HOLIDAYS: Holiday[] = [...HOLIDAYS_2026, ...HOLIDAYS_2027];

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return ALL_HOLIDAYS.filter((h) => h.date.startsWith(prefix));
}

export function getHoliday(date: string): Holiday | undefined {
  return ALL_HOLIDAYS.find((h) => h.date === date);
}
