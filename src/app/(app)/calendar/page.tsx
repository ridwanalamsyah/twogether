"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  useDeadlines,
  useSkripsiBimbingan,
  useTransactions,
  useAllItems,
  useAllEntries,
} from "@/stores/data";
import { formatDateShort, todayISO } from "@/lib/utils";
import { isoDay } from "@/lib/people";
import { buildIcs, googleCalendarUrl, saveIcs, type CalEvent } from "@/lib/ics";
import { Sheet } from "@/components/ui/Sheet";
import { ALL_HOLIDAYS } from "@/data/holidays";
import {
  indonesianDayOf,
  type ClassItem,
} from "@/data/classes";

interface Entry {
  kind:
    | "skripsi"
    | "deadline"
    | "tx"
    | "holiday"
    | "anniv"
    | "datenight"
    | "maintenance"
    | "meal"
    | "subscription"
    | "debt"
    | "period"
    | "class"
    | "item";
  label: string;
  href?: string;
  tint: string;
  cal?: CalEvent;
}

export default function CalendarPage() {
  const userId = useAuth((s) => s.userId);
  const deadlines = useDeadlines(userId);
  const bimbingan = useSkripsiBimbingan(userId);
  const txs = useTransactions(userId);
  const items = useAllItems(userId);
  const entries = useAllEntries(userId);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    const push = (date: string, e: Entry) => {
      const arr = map.get(date) ?? [];
      arr.push(e);
      map.set(date, arr);
    };
    for (const d of deadlines ?? []) {
      push(d.date, { kind: "deadline", label: d.title, tint: "var(--accent)", cal: { uid: d.id, title: d.title, date: d.date } });
    }
    for (const b of bimbingan ?? []) {
      push(b.date, {
        kind: "skripsi",
        label: b.topic,
        tint: "var(--tint-indigo)",
        href: "/skripsi",
        cal: { uid: b.id, title: `Bimbingan: ${b.topic}`, date: b.date },
      });
    }
    for (const t of txs ?? []) {
      push(t.date, {
        kind: "tx",
        label: `${t.kind === "in" ? "+" : "-"} ${t.category}`,
        tint: t.kind === "in" ? "var(--positive)" : "var(--negative)",
      });
    }
    // Hari libur Indonesia
    for (const h of ALL_HOLIDAYS) {
      push(h.date, {
        kind: "holiday",
        label: h.name,
        tint: h.type === "libur" ? "var(--tint-crimson)" : "var(--text-3)",
      });
    }
    // Items: anniv, datenight, maintenance, subscription, meal, debt
    const ITEM_MAP: Record<string, { tint: string; href: string; kind: Entry["kind"] }> = {
      anniv: { tint: "var(--tint-rose)", href: "/kita", kind: "anniv" },
      datenight: { tint: "var(--tint-mauve)", href: "/kita", kind: "datenight" },
      maintenance: { tint: "var(--tint-amber)", href: "/rumah", kind: "maintenance" },
      meal: { tint: "var(--tint-orange)", href: "/rumah", kind: "meal" },
      subscription: { tint: "var(--tint-indigo)", href: "/uang", kind: "subscription" },
      debt: { tint: "var(--negative)", href: "/uang", kind: "debt" },
      gift: { tint: "var(--tint-crimson)", href: "/list", kind: "item" },
      bucket: { tint: "var(--tint-teal)", href: "/kita", kind: "item" },
      surprise: { tint: "var(--accent)", href: "/kita", kind: "item" },
      wishlist: { tint: "var(--tint-cobalt)", href: "/list", kind: "item" },
    };
    for (const it of items ?? []) {
      const cfg = ITEM_MAP[it.kind];
      if (!cfg) continue;
      const date = it.due ?? it.date;
      if (!date) continue;
      push(date, {
        kind: cfg.kind,
        label: it.title,
        tint: cfg.tint,
        href: cfg.href,
        cal: { uid: it.id, title: it.title, date, repeat: it.kind === "anniv" ? "yearly" : undefined },
      });
      // Recurring anniv: project to the years around the visible month
      if (it.kind === "anniv") {
        try {
          const m = date.slice(5, 7);
          const d = date.slice(8, 10);
          const from = Math.max(cursor.y - 1, Number(date.slice(0, 4)));
          for (let y = from; y <= cursor.y + 1; y++) {
            const projected = `${y}-${m}-${d}`;
            if (projected !== date) {
              push(projected, {
                kind: "anniv",
                label: `${it.title} (anniv)`,
                tint: "var(--tint-rose)",
                href: "/kita",
              });
            }
          }
        } catch {}
      }
    }
    // Jadwal kuliah — read from items kind="class"
    const userClasses: ClassItem[] = [];
    for (const it of items ?? []) {
      if (it.kind !== "class" || !it.payload) continue;
      try {
        const p = JSON.parse(it.payload) as ClassItem;
        userClasses.push({
          ...p,
          title: it.title,
          lecturer: it.who ?? p.lecturer,
        });
      } catch {
        // ignore
      }
    }
    if (userClasses.length > 0) {
      const startMark = new Date(cursor.y, cursor.m - 1, 1);
      const endMark = new Date(cursor.y, cursor.m + 2, 0);
      for (
        let d = new Date(startMark);
        d <= endMark;
        d.setDate(d.getDate() + 1)
      ) {
        const dayName = indonesianDayOf(d);
        const classes = userClasses.filter((c) => c.day === dayName);
        if (classes.length > 0) {
          const iso = isoDay(d);
          for (const c of classes) {
            push(iso, {
              kind: "class",
              label: `${c.start} ${c.title}`,
              tint: "var(--tint-cobalt)",
              href: "/jadwal",
              cal: {
                uid: `class-${c.day}-${c.start}-${c.title}`.replace(/\W+/g, "-"),
                title: c.title,
                date: iso,
                start: c.start,
                end: c.end,
                location: c.room,
                repeat: "weekly",
              },
            });
          }
        }
      }
    }
    // Period prediction (next cycle ~28 days from last log)
    const periodEntries = (entries ?? []).filter((e) => e.kind === "period");
    if (periodEntries.length > 0) {
      const last = periodEntries.sort((a, b) => b.date.localeCompare(a.date))[0];
      const lastD = new Date(last.date);
      for (let i = 1; i <= 6; i++) {
        const next = new Date(lastD);
        next.setDate(next.getDate() + i * 28);
        push(isoDay(next), {
          kind: "period",
          label: "Prediksi siklus",
          tint: "var(--tint-rose)",
          href: "/sehat",
        });
      }
    }
    return map;
  }, [deadlines, bimbingan, txs, items, entries, cursor]);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const last = new Date(cursor.y, cursor.m + 1, 0);
    const pad = (first.getDay() + 6) % 7;
    const days: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < pad; i++) {
      const d = new Date(cursor.y, cursor.m, -pad + i + 1);
      days.push({ date: isoDay(d), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(cursor.y, cursor.m, d);
      days.push({ date: isoDay(dt), inMonth: true });
    }
    const tail = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= tail; i++) {
      const d = new Date(cursor.y, cursor.m + 1, i);
      days.push({ date: isoDay(d), inMonth: false });
    }
    return days;
  }, [cursor]);

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" },
  );
  const today = todayISO();
  const [focused, setFocused] = useState<string>(today);

  const focusedEntries = byDate.get(focused) ?? [];
  const [exporting, setExporting] = useState(false);
  const exportEvents = useMemo(() => {
    const seen = new Map<string, CalEvent>();
    for (const list of byDate.values()) for (const e of list) if (e.cal && !seen.has(e.cal.uid)) seen.set(e.cal.uid, e.cal);
    return Array.from(seen.values());
  }, [byDate]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Kalender"
        actions={
          <button type="button" onClick={() => setExporting(true)} aria-label="Sambungkan ke Google Calendar" className="min-h-[44px] whitespace-nowrap rounded-full bg-bg-card px-4 py-2 text-[13px] font-semibold text-text-2 shadow-card">
            Sinkron
          </button>
        }
      />

      <div className="px-5 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() =>
              setCursor((c) =>
                c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 },
              )
            }
            className="grid h-11 w-11 place-items-center rounded-md text-text-2 active:opacity-50"
          >
            ‹
          </button>
          <div className="text-[14px] font-medium tracking-tight">{monthName}</div>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            onClick={() =>
              setCursor((c) =>
                c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 },
              )
            }
            className="grid h-11 w-11 place-items-center rounded-md text-text-2 active:opacity-50"
          >
            ›
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-[12px] font-medium uppercase text-text-4">
          {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5">
          {monthDays.map((d) => {
            const has = (byDate.get(d.date) ?? []).length > 0;
            const isToday = d.date === today;
            const isFocused = d.date === focused;
            return (
              <button
                type="button"
                key={d.date}
                onClick={() => setFocused(d.date)}
                className={`relative flex aspect-square min-h-[44px] items-center justify-center rounded-md text-[12px] ${
                  isFocused
                    ? "bg-text-1 text-bg-app font-medium"
                    : isToday
                      ? "text-text-1 font-medium"
                      : d.inMonth
                        ? "text-text-2"
                        : "text-text-5"
                }`}
              >
                {parseInt(d.date.slice(-2))}
                {has && !isFocused && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[12px] font-medium section-label text-text-4">
            {formatDateShort(focused)}
          </div>
          {(() => {
            const dt = new Date(focused);
            const indoDay = indonesianDayOf(dt);
            const userClasses: ClassItem[] = [];
            for (const it of items ?? []) {
              if (it.kind !== "class" || !it.payload) continue;
              try {
                const p = JSON.parse(it.payload) as ClassItem;
                userClasses.push({
                  ...p,
                  title: it.title,
                  lecturer: it.who ?? p.lecturer,
                });
              } catch {
                // ignore
              }
            }
            const classes = userClasses.filter((c) => c.day === indoDay);
            if (classes.length === 0) return null;
            return (
              <div className="mb-3 rounded-md border border-border p-3">
                <div className="mb-1 text-[12px] section-label text-text-4">
                  Jadwal kuliah {indoDay}
                </div>
                {classes.sort((a, b) => a.start.localeCompare(b.start)).map((c, i) => (
                  <div key={i} className="flex items-baseline justify-between py-0.5 text-[12px]">
                    <span className="text-text-1">{c.title}</span>
                    <span className="text-text-3">{c.start}-{c.end}{c.room ? ` · ${c.room}` : ""}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {focusedEntries.length === 0 ? (
            <div className="rounded-[18px] bg-bg-elev1 px-4 py-4 text-center text-[14px] text-text-3">
              Tidak ada agenda.
            </div>
          ) : (
            <ul className="list-card">
              {focusedEntries.map((e, i) => {
                const content = (
                  <div className="flex min-h-[44px] items-center gap-2.5 py-2.5">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: e.tint }}
                    />
                    <span className="flex-1 truncate text-[13px] text-text-1">{e.label}</span>
                  </div>
                );
                return (
                  <li key={i} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      {e.href ? <Link href={e.href} className="block active:opacity-60">{content}</Link> : content}
                    </div>
                    {e.cal && (
                      <a
                        href={googleCalendarUrl(e.cal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-bg-elev2 px-3 py-1.5 text-[12px] font-semibold text-text-2"
                        aria-label={`Tambah ${e.label} ke Google Calendar`}
                      >
                        + Google
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <AnimatePresence>
        {exporting && (
          <Sheet
            key="cal-export"
            title="Ke Google Calendar"
            onClose={() => setExporting(false)}
            footer={
              <button
                type="button"
                onClick={() => void saveIcs(buildIcs(exportEvents)).then(() => setExporting(false))}
                disabled={!exportEvents.length}
                className="btn-accent w-full disabled:opacity-50"
              >
                Unduh {exportEvents.length} agenda (.ics)
              </button>
            }
          >
            <p className="text-[13px] leading-relaxed text-text-2">
              Semua tenggat, bimbingan, jadwal kuliah (berulang tiap minggu), anniversary (tiap tahun), dan rencana kencan
              dijadikan satu file kalender.
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-text-2">
              <li><b>iPhone/iPad:</b> buka filenya &gt; Tambahkan semua. Kalau Google Calendar tersambung di Pengaturan iPhone, pilih kalender Google-nya.</li>
              <li><b>Laptop:</b> buka calendar.google.com &gt; Setelan &gt; Impor &amp; ekspor &gt; pilih file tadi.</li>
              <li>Untuk satu agenda saja, ketuk <b>+ Google</b> di samping agendanya.</li>
            </ol>
            <p className="mt-3 text-[12px] text-text-4">
              Ini salinan sekali jalan: kalau nanti ada agenda baru, unduh lagi atau pakai tombol + Google.
            </p>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}
