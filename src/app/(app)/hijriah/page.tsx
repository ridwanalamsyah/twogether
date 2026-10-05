"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Chips } from "@/components/ui/Sheet";
import { useIbadahPrefs } from "@/stores/ibadah";
import { HIJRI_MONTHS, islamicDays, toHijri } from "@/lib/hijri";
import { daysBetween, fromIsoDay, isoDay, addDays } from "@/lib/people";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function HijriahPage() {
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
          className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
          style={{ background: "linear-gradient(135deg,#0f7a5c,#1fae84 60%,#d9b24c 140%)" }}
        >
          <span aria-hidden className="absolute -right-2 -top-4 text-[86px] opacity-20">🌙</span>
          <div className="text-[13px] font-semibold text-white/85">Hari ini</div>
          <div className="text-[30px] font-extrabold leading-tight">{h.day} {HIJRI_MONTHS[h.month - 1]}</div>
          <div className="text-[14px] text-white/85">
            {h.year} H · {fromIsoDay(today).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        <div className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1 text-text-2" aria-label="Bulan sebelumnya">‹</button>
            <div className="text-center">
              <div className="text-[15px] font-bold text-text-1">
                {first.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </div>
              <div className="text-[11px] text-text-3">
                {HIJRI_MONTHS[h1.month - 1]}
                {h1.month !== h2.month ? ` – ${HIJRI_MONTHS[h2.month - 1]}` : ""} {h2.year}
              </div>
            </div>
            <button onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1 text-text-2" aria-label="Bulan berikutnya">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-4">
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
                    ev?.major ? "bg-[#1fae84] text-white" : ev?.fast ? "bg-[#1fae84]/10 text-text-1" : "text-text-2"
                  } ${d === today ? "ring-2 ring-text-1" : ""}`}
                >
                  <span className="text-[13px] font-semibold leading-none">{Number(d.slice(8))}</span>
                  <span className={`mt-0.5 text-[9px] leading-none ${ev?.major ? "text-white/85" : "text-text-4"}`}>{hd.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative grid grid-cols-2 rounded-[12px] bg-bg-elev2 p-1 text-[14px]">
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[9px] bg-bg-card shadow-sm transition-transform duration-300 ease-ios"
            style={{ transform: tab === "hari" ? "none" : "translateX(100%)" }}
          />
          {(["hari", "puasa"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative py-2 font-semibold ${tab === t ? "text-text-1" : "text-text-3"}`}>
              {t === "hari" ? "Hari besar" : "Puasa sunnah"}
            </button>
          ))}
        </div>

        <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
          {(tab === "hari" ? major : fasts).map((e) => {
            const n = daysBetween(today, e.date);
            return (
              <li key={e.date + e.title} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1fae84]/10 text-[20px]">{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-text-1">{e.title}</div>
                  <div className="text-[12px] text-text-3">
                    {fromIsoDay(e.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {e.hijri.label}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-bg-elev2 px-2.5 py-1 text-[11px] font-semibold text-text-2">
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
              { value: -1, label: "−1 hari" },
              { value: 0, label: "Sesuai" },
              { value: 1, label: "+1 hari" },
            ]}
            value={offset}
            onChange={setOffset}
          />
          <p className="mt-2 text-[11px] text-text-4">Besok: {toHijri(addDays(today, 1), offset).label}</p>
        </div>
      </div>
    </div>
  );
}
