"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  SEMESTER_6_SCHEDULE,
  indonesianDayOf,
  type ClassDay,
} from "@/data/classes";
import { WidgetShell } from "./WidgetShell";

/**
 * Compact widget showing today's class schedule at a glance.
 */
export function JadwalHariIniWidget() {
  const { day, classes } = useMemo(() => {
    const today = new Date();
    const day: ClassDay = indonesianDayOf(today);
    const classes = SEMESTER_6_SCHEDULE.filter((c) => c.day === day).sort(
      (a, b) => a.start.localeCompare(b.start),
    );
    return { day, classes };
  }, []);

  return (
    <WidgetShell
      title={`Jadwal · ${day}`}
      action={
        <Link href="/jadwal" className="text-[11px] text-text-3">
          Lihat semua
        </Link>
      }
    >
      {classes.length === 0 ? (
        <p className="text-[12px] text-text-3">Tidak ada kuliah hari ini.</p>
      ) : (
        <ul className="space-y-1.5">
          {classes.map((c, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-2 text-[12px]"
            >
              <span className="truncate text-text-1">{c.title}</span>
              <span className="font-mono text-[11px] tabular-nums text-text-3">
                {c.start}–{c.end}
                {c.room ? ` · ${c.room}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
