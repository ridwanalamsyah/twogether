"use client";

import { useNick } from "@/lib/nick";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { useShalatPrefs } from "@/stores/shalat";
import { useIbadahPrefs } from "@/stores/ibadah";
import { deleteEntry, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { prayerTimes, fmtTime } from "@/lib/prayer";
import { ramadhanRange, toHijri } from "@/lib/hijri";
import { usePeople, addDays, daysBetween, fromIsoDay, isoDay, parsePayload } from "@/lib/people";
import { computeCycle, isPeriodDay, DEFAULT_CYCLE_SETTINGS, type CycleSettings } from "@/lib/cycle";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

type DayStatus = "puasa" | "haid" | "sakit" | "safar" | "tidak";
const STATUS: { id: DayStatus; label: string; emoji: string }[] = [
  { id: "puasa", label: "Puasa", emoji: "✅" },
  { id: "haid", label: "Haid / nifas", emoji: "🌸" },
  { id: "sakit", label: "Sakit", emoji: "🤒" },
  { id: "safar", label: "Perjalanan", emoji: "✈️" },
  { id: "tidak", label: "Tidak puasa", emoji: "⏸️" },
];

export default function RamadhanPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const place = useShalatPrefs();
  const offset = useIbadahPrefs((s) => s.hijriOffset);
  const puasa = useEntries(userId, "puasa") ?? [];
  const tarawih = useEntries(userId, "tarawih") ?? [];
  const cycle = useEntries(userId, "cycle") ?? [];
  const cycleSettings = useItems(userId, "cycle-settings") ?? [];
  const qadhaItems = useItems(userId, "qadha") ?? [];
  const [now, setNow] = useState(() => new Date());
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = isoDay(now);
  const range = useMemo(() => ramadhanRange(today, offset), [today, offset]);
  const inRamadhan = !!range && today >= range.start && today <= range.end;
  const t = prayerTimes(place.lat, place.lng, now);
  const imsak = new Date(t.subuh.getTime() - 10 * 60_000);
  const myCycle = computeCycle(
    cycle.filter((e) => (e.who || me) === me),
    parsePayload<CycleSettings>(cycleSettings.find((i) => (i.who || me) === me)?.payload, DEFAULT_CYCLE_SETTINGS),
    today,
  );

  const statusOf = (who: string, day: string) =>
    puasa.find((p) => p.date === day && (p.who || me) === who)?.valueText as DayStatus | undefined;
  const tarawihOn = (who: string, day: string) => tarawih.some((p) => p.date === day && (p.who || me) === who);

  const qadha = qadhaItems.find((i) => (i.who || me) === me);
  async function bumpQadha(delta: number) {
    if (!userId || delta === 0) return;
    await upsertItem(userId, {
      id: qadha?.id,
      kind: "qadha",
      title: "Hutang puasa",
      who: me,
      amount: Math.max(0, (qadha?.amount ?? 0) + delta),
    });
  }

  async function setDay(day: string, status: DayStatus | null) {
    if (!userId) return;
    const existing = puasa.find((p) => p.date === day && (p.who || me) === me);
    const wasOwed = existing && existing.valueText !== "puasa";
    const nowOwed = status && status !== "puasa";
    if (existing && !status) await deleteEntry(userId, existing.id);
    else if (status) await upsertEntry(userId, { id: existing?.id, kind: "puasa", date: day, who: me, valueText: status });
    // Missed days during Ramadhan become qadha automatically.
    await bumpQadha((nowOwed ? 1 : 0) - (wasOwed ? 1 : 0));
    if (status === "puasa") hapticSuccess();
    else hapticTap();
  }
  async function toggleTarawih(day: string) {
    if (!userId) return;
    const existing = tarawih.find((p) => p.date === day && (p.who || me) === me);
    if (existing) await deleteEntry(userId, existing.id);
    else {
      await upsertEntry(userId, { kind: "tarawih", date: day, who: me, valueNum: 1 });
      hapticSuccess();
    }
  }

  if (!range) return null;
  const dayNum = inRamadhan ? daysBetween(range.start, today) + 1 : 0;
  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
  const countFor = (who: string) => days.filter((d) => statusOf(who, d) === "puasa").length;
  const nextEvent = now < imsak ? { label: "Imsak", at: imsak } : now < t.maghrib ? { label: "Berbuka", at: t.maghrib } : null;
  const mins = nextEvent ? Math.max(0, Math.round((nextEvent.at.getTime() - now.getTime()) / 60000)) : 0;

  return (
    <div>
      <AppHeader title="Ramadhan" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div
          className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
          style={{ background: "linear-gradient(135deg,#123a5c,#0f7a5c 55%,#d9b24c 130%)" }}
        >
          <span aria-hidden className="absolute -right-3 -top-3 text-[90px] opacity-20">🌙</span>
          {inRamadhan ? (
            <>
              <div className="text-[13px] font-semibold text-white/85">
                Ramadhan hari ke-{dayNum} · {toHijri(today, offset).year} H
              </div>
              {nextEvent ? (
                <>
                  <div className="mt-1 text-[30px] font-extrabold leading-tight">
                    {nextEvent.label} {fmtTime(nextEvent.at)}
                  </div>
                  <div className="text-[14px] text-white/85">
                    {mins >= 60 ? `${Math.floor(mins / 60)} jam ${mins % 60} menit lagi` : `${mins} menit lagi`}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[26px] font-extrabold">Selamat berbuka 🤍</div>
              )}
              <div className="mt-3 flex gap-2 text-[12px]">
                <span className="rounded-full bg-white/20 px-3 py-1 font-semibold">Imsak {fmtTime(imsak)}</span>
                <span className="rounded-full bg-white/20 px-3 py-1 font-semibold">Buka {fmtTime(t.maghrib)}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDay(today, statusOf(me, today) === "puasa" ? null : "puasa")}
                  className={`flex-1 rounded-full py-2.5 text-[14px] font-bold active:scale-[0.98] ${statusOf(me, today) === "puasa" ? "bg-white text-[#0f7a5c]" : "bg-white/20"}`}
                >
                  {statusOf(me, today) === "puasa" ? "✓ Puasa hari ini" : "Puasa hari ini"}
                </button>
                <button
                  onClick={() => toggleTarawih(today)}
                  className={`flex-1 rounded-full py-2.5 text-[14px] font-bold active:scale-[0.98] ${tarawihOn(me, today) ? "bg-white text-[#0f7a5c]" : "bg-white/20"}`}
                >
                  {tarawihOn(me, today) ? "✓ Tarawih" : "Tarawih"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-semibold text-white/85">Menuju Ramadhan</div>
              <div className="mt-1 text-[34px] font-extrabold leading-tight">{daysBetween(today, range.start)} hari lagi</div>
              <div className="text-[14px] text-white/85">
                Perkiraan 1 Ramadhan: {fromIsoDay(range.start).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </>
          )}
        </div>

        {myCycle.onPeriod && inRamadhan && statusOf(me, today) !== "haid" && (
          <button
            onClick={() => setDay(today, "haid")}
            className="w-full rounded-[18px] bg-accent-soft px-4 py-3 text-left text-[13px] text-text-2"
          >
            🌸 Sedang haid — tap untuk tandai hari ini sebagai libur (otomatis masuk hutang puasa).
          </button>
        )}

        {(qadha?.amount ?? 0) > 0 && (
          <div className="surface flex items-center gap-3 p-4">
            <span className="text-[22px]">📝</span>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-text-1">Hutang puasa: {qadha?.amount} hari</div>
              <div className="text-[12px] text-text-3">
                {inRamadhan ? "Diganti setelah Ramadhan ya." : "Yuk dicicil sebelum Ramadhan datang."}
              </div>
            </div>
            <Link href="/shalat" className="text-[12px] font-semibold text-accent">Atur ›</Link>
          </div>
        )}

        <div className="surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[15px] font-bold text-text-1">Puasa Ramadhan</span>
            <span className="text-[12px] text-text-3">
              Kamu {countFor(me)}/{range.days}
              {partner ? ` · ${nick(partner)} ${countFor(partner)}/${range.days}` : ""}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {days.map((d, i) => {
              const s = statusOf(me, d);
              const future = d > today;
              const period = !s && isPeriodDay(myCycle, d);
              return (
                <button
                  key={d}
                  disabled={future}
                  onClick={() => setPick(d)}
                  className={`relative grid aspect-square place-items-center rounded-2xl text-[13px] font-bold transition-transform active:scale-90 disabled:opacity-40 ${
                    s === "puasa"
                      ? "bg-[#0f7a5c] text-white"
                      : s
                        ? "bg-accent-soft text-text-1"
                        : period
                          ? "border-2 border-dashed border-accent text-text-2"
                          : d === today
                            ? "ring-2 ring-[#0f7a5c] text-text-1"
                            : "bg-bg-elev1 text-text-2"
                  }`}
                >
                  {s && s !== "puasa" ? STATUS.find((x) => x.id === s)?.emoji : i + 1}
                  {tarawihOn(me, d) && <span className="absolute -right-0.5 -top-0.5 text-[10px]">🌙</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-text-4">
            Tanggal mengikuti kalender Hijriah (bisa dikoreksi di Kalender Hijriah). Tap hari untuk ubah status.
          </p>
        </div>

        <Link href="/tilawah" className="pressable surface flex items-center gap-3 p-4">
          <span className="text-[22px]">📖</span>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-text-1">Target khatam Ramadhan</div>
            <div className="text-[12px] text-text-3">Catat tilawah berdua</div>
          </div>
          <span className="text-text-4">›</span>
        </Link>
      </div>

      {pick && (
        <Sheet
          title={`Ramadhan hari ke-${daysBetween(range.start, pick) + 1}`}
          onClose={() => setPick(null)}
        >
          <div className="space-y-2">
            {STATUS.map((s) => (
              <button
                key={s.id}
                onClick={async () => {
                  await setDay(pick, statusOf(me, pick) === s.id ? null : s.id);
                  setPick(null);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold ${
                  statusOf(me, pick) === s.id ? "bg-accent text-accent-fg" : "bg-bg-card text-text-1 shadow-card"
                }`}
              >
                <span className="text-[20px]">{s.emoji}</span>
                {s.label}
              </button>
            ))}
            <button
              onClick={() => toggleTarawih(pick)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold ${
                tarawihOn(me, pick) ? "bg-[#0f7a5c] text-white" : "bg-bg-card text-text-1 shadow-card"
              }`}
            >
              <span className="text-[20px]">🌙</span>
              {tarawihOn(me, pick) ? "Tarawih ✓" : "Tarawih"}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-text-4">Hari tidak puasa otomatis ditambahkan ke hutang puasa.</p>
        </Sheet>
      )}
    </div>
  );
}
