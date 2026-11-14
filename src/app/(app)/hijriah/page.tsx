"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Moon } from "lucide-react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Chips } from "@/components/ui/Sheet";
import { useIbadahPrefs } from "@/stores/ibadah";
import { HIJRI_MONTHS, islamicDays, toHijri } from "@/lib/hijri";
import { daysBetween, fromIsoDay, isoDay, addDays } from "@/lib/people";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function HijriahPage() {
  const reduceMotion = useReducedMotion();
  const offset = useIbadahPrefs((s) => s.hijriOffset);
  const setOffset = useIbadahPrefs((s) => s.setHijriOffset);
  const today = isoDay(new Date());
  const h = toHijri(today, offset);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [tab, setTab] = useState<"hari" | "puasa">("hari");

  const upcoming = useMemo(() => islamicDays(today, 400, offset), [today, offset]);
  const major = upcoming.filter((e) => !e.fast || e.title.includes("Arafah") || e.title.includes("Asyura"));
  const fasts = upcoming.filter((e) => e.fast).slice(0, 12);

  // Month grid with hijri day numbers.
  const first = fromIsoDay(`${month}-01`);
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: lead }, () => null as string | null),
    ...Array.from({ length: dim }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const monthEvents = new Map(islamicDays(`${month}-01`, dim, offset).map((e) => [e.date, e]));
  const shift = (n: number) => setMonth(isoDay(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7));
  const h1 = toHijri(`${month}-01`, offset);
  const h2 = toHijri(`${month}-${String(dim).padStart(2, "0")}`, offset);

  return (
    <div>
      <AppHeader title="Kalender Hijriah" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div
          className="hero-soft relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
          style={{ ["--hero" as string]: "var(--tint-pine)" }}
        >
          <div className="text-[13px] font-semibold text-white/90">Hari ini</div>
          <div className="text-[30px] font-extrabold leading-tight">{h.day} {HIJRI_MONTHS[h.month - 1]}</div>
          <div className="text-[14px] text-white/90">
            {h.year} H · {fromIsoDay(today).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        <div className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-bg-elev1 text-text-2 transition-colors hover:bg-bg-elev2 active:scale-95"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="text-center">
              <div className="text-[15px] font-bold text-text-1">
                {first.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </div>
              <div className="text-[12px] text-text-3">
                {HIJRI_MONTHS[h1.month - 1]}
                {h1.month !== h2.month ? ` - ${HIJRI_MONTHS[h2.month - 1]}` : ""} {h2.year}
              </div>
            </div>
            <button
              type="button"
              onClick={() => shift(1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-bg-elev1 text-text-2 transition-colors hover:bg-bg-elev2 active:scale-95"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold text-text-4">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`x${i}`} />;
              const ev = monthEvents.get(d);
              const hd = toHijri(d, offset);
              return (
                <div
                  key={d}
                  title={ev?.title}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-center ${
                    ev?.major ? "bg-accent text-accent-fg" : ev?.fast ? "bg-accent/10 text-text-1" : "text-text-2"
                  } ${d === today ? "ring-2 ring-text-1" : ""}`}
                >
                  <span className="text-[13px] font-semibold leading-none tabular-nums">{Number(d.slice(8))}</span>
                  <span className={`mt-0.5 text-[12px] leading-none tabular-nums ${ev?.major ? "opacity-90" : "text-text-3"}`}>{hd.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div role="tablist" aria-label="Kategori kalender Hijriah" className="relative grid grid-cols-2 rounded-[12px] bg-bg-elev2 p-1 text-[14px]">
          {(["hari", "puasa"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={`relative min-h-[44px] rounded-[9px] py-2 font-semibold transition-colors ${active ? "text-text-1" : "text-text-3"}`}
              >
                {active && (
                  <motion.span
                    layoutId="hijriah-tab-pill"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[9px] bg-bg-card shadow-sm"
                  />
                )}
                <span className="relative z-10">{t === "hari" ? "Hari besar" : "Puasa sunnah"}</span>
              </button>
            );
          })}
        </div>

        <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
          {(tab === "hari" ? major : fasts).map((e) => {
            const n = daysBetween(today, e.date);
            const EventIcon = e.fast ? Moon : CalendarDays;
            return (
              <li key={e.date + e.title} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
                  <EventIcon size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-text-1">{e.title}</div>
                  <div className="text-[12px] text-text-3">
                    {fromIsoDay(e.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {e.hijri.label}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-bg-elev2 px-2.5 py-1 text-[12px] font-semibold text-text-2">
                  {n === 0 ? "Hari ini" : n === 1 ? "Besok" : `${n} hari`}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="surface p-4">
          <div className="text-[14px] font-bold text-text-1">Koreksi tanggal</div>
          <p className="mb-2 text-[12px] text-text-3">
            Dihitung dengan kalender Umm al-Qura. Kalau penetapan pemerintah (sidang isbat) beda, geser di sini.
          </p>
          <Chips
            options={[
              { value: -1, label: "-1 hari" },
              { value: 0, label: "Sesuai" },
              { value: 1, label: "+1 hari" },
            ]}
            value={offset}
            onChange={setOffset}
          />
          <p className="mt-2 text-[12px] text-text-3">Besok: {toHijri(addDays(today, 1), offset).label}</p>
        </div>
      </div>
    </div>
  );
}
