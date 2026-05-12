"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useItems } from "@/stores/data";
import {
  indonesianDayOf,
  type ClassDay,
  type ClassItem,
} from "@/data/classes";
import { WidgetShell } from "./WidgetShell";
import { useStableArray } from "@/lib/useStableArray";

/**
 * Compact widget showing today's class schedule at a glance.
 * Reads from items kind="class" (editable per user).
 */
export function JadwalHariIniWidget() {
  const userId = useAuth((s) => s.userId);
  const items = useStableArray(useItems(userId, "class"));
  const { day, classes } = useMemo(() => {
    const day: ClassDay = indonesianDayOf(new Date());
    const out: ClassItem[] = [];
    for (const it of items) {
      if (!it.payload) continue;
      try {
        const p = JSON.parse(it.payload) as ClassItem;
        if (p.day === day) {
          out.push({
            ...p,
            title: it.title,
            lecturer: it.who ?? p.lecturer,
          });
        }
      } catch {
        // ignore
      }
    }
    out.sort((a, b) => a.start.localeCompare(b.start));
    return { day, classes: out };
  }, [items]);

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
