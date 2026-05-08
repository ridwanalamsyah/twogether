"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { Empty, Section } from "@/components/tracker/Section";
import {
  SEMESTER_6_SCHEDULE,
  DAY_ORDER,
  indonesianDayOf,
  type ClassDay,
} from "@/data/classes";

export default function JadwalPage() {
  const today = indonesianDayOf(new Date());
  const [activeDay, setActiveDay] = useState<ClassDay>(today);

  const grouped = useMemo(() => {
    const m = new Map<ClassDay, typeof SEMESTER_6_SCHEDULE>();
    for (const c of SEMESTER_6_SCHEDULE) {
      if (!m.has(c.day)) m.set(c.day, []);
      m.get(c.day)!.push(c);
    }
    for (const [, list] of m) list.sort((a, b) => a.start.localeCompare(b.start));
    return m;
  }, []);

  const dayClasses = grouped.get(activeDay) ?? [];

  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Jadwal Kuliah"
        subtitle="Semester 6 — Alya & Ridwan"
        actions={
          <Link href="/home" className="text-[12px] text-text-3 active:opacity-50">
            Tutup
          </Link>
        }
      />
      <div className="px-5">
        <div className="mb-3 flex gap-1 overflow-x-auto no-scrollbar">
          {DAY_ORDER.map((d) => {
            const count = grouped.get(d)?.length ?? 0;
            const isActive = activeDay === d;
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`flex-shrink-0 rounded-md border px-3 py-1.5 text-[12px] ${
                  isActive
                    ? "border-text-1 text-text-1"
                    : "border-border text-text-3"
                } ${d === today ? "font-medium" : ""}`}
              >
                {d}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] text-text-4">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {dayClasses.length === 0 ? (
          <Empty>Tidak ada kuliah di hari {activeDay}.</Empty>
        ) : (
          <div className="space-y-2">
            {dayClasses.map((c, i) => (
              <div
                key={`${c.day}-${c.start}-${i}`}
                className="border-b border-border py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium">{c.title}</div>
                    <div className="mt-0.5 text-[11px] text-text-3">
                      {c.lecturer}
                    </div>
                    {(c.pj || c.cp) && (
                      <div className="mt-1 text-[11px] text-text-3">
                        {c.pj && (
                          <span>
                            PJ: <span className="text-text-2">{c.pj}</span>
                          </span>
                        )}
                        {c.pj && c.cp && <span> · </span>}
                        {c.cp && (
                          <a
                            href={`tel:${c.cp.replace(/[^+\d]/g, "")}`}
                            className="text-text-2 underline"
                          >
                            {c.cp}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[13px] tabular-nums">
                      {c.start}–{c.end}
                    </div>
                    {c.room && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-4">
                        Ruang {c.room}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Section title="Ringkasan minggu" defaultOpen={false}>
          <div className="space-y-1 text-[12px]">
            {DAY_ORDER.slice(0, 5).map((d) => {
              const list = grouped.get(d) ?? [];
              if (list.length === 0)
                return (
                  <div key={d} className="flex justify-between border-b border-border py-2">
                    <span className="text-text-3">{d}</span>
                    <span className="text-text-4">—</span>
                  </div>
                );
              return (
                <div
                  key={d}
                  className="flex items-start justify-between gap-3 border-b border-border py-2"
                >
                  <span className="text-text-3">{d}</span>
                  <div className="flex-1 text-right text-[11px] text-text-2">
                    {list.map((c, idx) => (
                      <div key={idx}>
                        {c.start} {c.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
