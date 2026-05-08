/**
 * Jadwal Kuliah Semester 6 — Alya & Ridwan.
 * Stored as items kind="class" with payload containing time/room/lecturer/PJ/CP.
 */

export type ClassDay =
  | "Senin"
  | "Selasa"
  | "Rabu"
  | "Kamis"
  | "Jumat"
  | "Sabtu"
  | "Minggu";

export interface ClassItem {
  day: ClassDay;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  room?: string;
  title: string;
  lecturer: string;
  pj?: string;
  cp?: string;
}

export const SEMESTER_6_SCHEDULE: ClassItem[] = [
  // Senin
  {
    day: "Senin",
    start: "07:00",
    end: "08:40",
    room: "B",
    title: "Pegadaian Syariah",
    lecturer: "Ibu Wiedya",
  },
  {
    day: "Senin",
    start: "10:20",
    end: "12:00",
    room: "4.23",
    title: "Seminar Ekonomi Syariah",
    lecturer: "Yadi Janwari",
    pj: "Ghilman",
    cp: "+62 812-2114-003",
  },

  // Selasa
  {
    day: "Selasa",
    start: "07:00",
    end: "08:40",
    room: "3.7",
    title: "Keuangan Publik Islam",
    lecturer: "Endang Jumali",
    pj: "Fahmi",
  },
  {
    day: "Selasa",
    start: "08:40",
    end: "10:20",
    room: "4.13",
    title: "Perpajakan",
    lecturer: "Gina Sakinah",
    pj: "Syahrul",
    cp: "+62 877-8655-4808",
  },
  {
    day: "Selasa",
    start: "12:45",
    end: "14:25",
    room: "4.21",
    title: "Manajemen Keuangan Syariah",
    lecturer: "Anisa Ilmia",
    pj: "Ihsan",
    cp: "+62 823-1554-5326",
  },

  // Rabu
  {
    day: "Rabu",
    start: "12:45",
    end: "14:25",
    room: "4.21",
    title: "Praktik Profesi Lapangan",
    lecturer: "Anisa Ilmia",
    pj: "CEO Rifqi",
    cp: "+62 823-1554-5326",
  },

  // Kamis
  {
    day: "Kamis",
    start: "08:40",
    end: "10:20",
    room: "4.21",
    title: "Pasar Modal Syariah",
    lecturer: "Mohammad Yahdi",
    pj: "Tanzi Maulana",
    cp: "+62 857-7776-5417",
  },
  {
    day: "Kamis",
    start: "10:20",
    end: "12:00",
    room: "4.23",
    title: "Sosiologi Ekonomi",
    lecturer: "Dedah Jubaedah",
    pj: "Efii",
    cp: "+62 813-2000-9928",
  },
  {
    day: "Kamis",
    start: "15:15",
    end: "17:45",
    room: "4.21",
    title: "Pariwisata Halal",
    lecturer: "Muhammad Hasanuddin",
    pj: "Ikhwan",
    cp: "+62 853-1560-7555",
  },
];

export const DAY_ORDER: ClassDay[] = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

/** Get JS Date day index (0=Sun..6=Sat) → Indonesian day. */
export function indonesianDayOf(d: Date): ClassDay {
  return DAY_ORDER[(d.getDay() + 6) % 7];
}
