"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { deleteEntry, upsertEntry, useEntries, useItems } from "@/stores/data";
import { useShalatPrefs } from "@/stores/shalat";
import { useIbadahPrefs } from "@/stores/ibadah";
import { usePeople, parsePayload, isoDay, daysBetween } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { prayerTimes, fmtTime } from "@/lib/prayer";
import { ramadhanRange } from "@/lib/hijri";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Today's check-in for every running challenge. */
export function TantanganWidget() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const challenges = useItems(userId, "challenge") ?? [];
  const logs = useEntries(userId, "challenge-log") ?? [];
  const today = isoDay(new Date());
  const active = challenges.filter((c) => c.status !== "done" && (c.date ?? today) <= today && today <= (c.due ?? today));

  const logOf = (cid: string, who: string) =>
    logs.find((l) => l.date === today && (l.who || me) === who && parsePayload(l.payload, { challengeId: "" }).challengeId === cid);

  async function toggle(cid: string) {
    if (!userId) return;
    const mine = logOf(cid, me);
    if (mine) {
      await deleteEntry(userId, mine.id);
      hapticTap();
    } else {
      await upsertEntry(userId, { kind: "challenge-log", date: today, who: me, payload: JSON.stringify({ challengeId: cid }) });
      hapticSuccess();
    }
  }

  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <Link href="/tantangan" className="text-[15px] font-bold text-text-1">🔥 Tantangan hari ini</Link>
        <Link href="/tantangan" className="text-[12px] text-text-3">Lihat ›</Link>
      </div>
      {active.length === 0 ? (
        <Link href="/tantangan" className="block rounded-2xl bg-bg-elev1 px-4 py-3 text-[13px] text-text-3">
          Belum ada tantangan berjalan. Mulai satu bareng {partner ? nick(partner) : "pasangan"} →
        </Link>
      ) : (
        <div className="space-y-2">
          {active.slice(0, 3).map((c) => {
            const p = parsePayload(c.payload, { emoji: "🔥" });
            const done = !!logOf(c.id, me);
            const theirs = partner ? !!logOf(c.id, partner) : null;
            const day = daysBetween(c.date ?? today, today) + 1;
            const total = daysBetween(c.date ?? today, c.due ?? today) + 1;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-bg-elev1 px-3 py-2.5">
                <span className="text-[20px]">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-text-1">{c.title}</div>
                  <div className="text-[11px] text-text-4">
                    Hari {day}/{total}
                    {theirs != null && ` · ${nick(partner)} ${theirs ? "sudah ✓" : "belum"}`}
                  </div>
                </div>
                <button
                  onClick={() => toggle(c.id)}
                  aria-label={done ? "Batalkan" : "Aku sudah"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-bold transition-colors ${
                    done ? "bg-accent text-accent-fg" : "border-2 border-border-strong text-transparent"
                  }`}
                >
                  ✓
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FokusPayload {
  start: number;
  minutes: number;
  status: "run" | "done" | "stop";
}

/** Who is focusing right now, with a one-tap "join". */
export function FokusWidget() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const sessions = useEntries(userId, "fokus") ?? [];
  const now = useNow(15_000).getTime();
  const running = (who: string) =>
    sessions.find((s) => {
      if ((s.who || me) !== who) return false;
      const p = parsePayload<FokusPayload>(s.payload, { start: 0, minutes: 0, status: "done" });
      return p.status === "run" && now < p.start + p.minutes * 60_000;
    });
  const mine = running(me);
  const theirs = partner ? running(partner) : undefined;
  const today = isoDay(new Date());
  const todayMins = sessions
    .filter((s) => s.date === today && (s.who || me) === me)
    .reduce((a, s) => a + (s.valueNum ?? 0), 0);
  const left = (e: typeof mine) => {
    if (!e) return 0;
    const p = parsePayload<FokusPayload>(e.payload, { start: 0, minutes: 0, status: "run" });
    return Math.max(1, Math.round((p.start + p.minutes * 60_000 - now) / 60_000));
  };

  return (
    <Link href="/fokus" className="pressable surface flex items-center gap-3 p-4">
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-[22px]">
        🎧
        {(mine || theirs) && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-[color:var(--positive)] ring-2 ring-bg-card" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-text-1">
          {mine
            ? `Kamu lagi fokus · ${left(mine)} mnt lagi`
            : theirs
              ? `${nick(partner)} lagi fokus`
              : "Fokus bareng"}
        </div>
        <div className="truncate text-[12px] text-text-3">
          {theirs && !mine
            ? `${theirs.valueText ? `${theirs.valueText} · ` : ""}sisa ${left(theirs)} mnt — ketuk untuk ikut`
            : todayMins
              ? `Hari ini ${todayMins} menit`
              : "Mulai 25 menit, saling nemenin"}
        </div>
      </div>
      <span className="text-text-4">›</span>
    </Link>
  );
}

/** Ramadhan countdown: imsak/buka during the month, days to go before it. */
export function RamadhanWidget() {
  const place = useShalatPrefs();
  const offset = useIbadahPrefs((s) => s.hijriOffset);
  const now = useNow(30_000);
  const today = isoDay(now);
  const range = ramadhanRange(today, offset);
  const inRamadhan = !!range && range.start <= today && today <= range.end;
  const t = prayerTimes(place.lat, place.lng, now);
  const imsak = new Date(t.subuh.getTime() - 10 * 60_000);
  const next = now < imsak ? { label: "Imsak", at: imsak } : now < t.maghrib ? { label: "Buka puasa", at: t.maghrib } : null;
  const mins = next ? Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60_000)) : 0;
  const daysTo = range ? daysBetween(today, range.start) : null;

  return (
    <Link
      href="/ramadhan"
      className="pressable block rounded-[22px] p-4 text-white shadow-float"
      style={{ background: "linear-gradient(135deg,#3b2a5c,#7a4f9e 60%,#d9b24c 140%)" }}
    >
      {inRamadhan ? (
        <>
          <div className="text-[12px] font-semibold text-white/85">
            🏮 Ramadhan hari ke-{daysBetween(range!.start, today) + 1}
          </div>
          {next ? (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[14px] font-semibold">{next.label}</span>
              <span className="font-mono text-[28px] font-extrabold leading-none">{fmtTime(next.at)}</span>
              <span className="text-[12px] text-white/80">
                {mins >= 60 ? `${Math.floor(mins / 60)}j ${mins % 60}m lagi` : `${mins} menit lagi`}
              </span>
            </div>
          ) : (
            <div className="mt-0.5 text-[18px] font-extrabold">Selamat berbuka 🤍 Jangan lupa tarawih</div>
          )}
        </>
      ) : (
        <>
          <div className="text-[12px] font-semibold text-white/85">🏮 Menuju Ramadhan</div>
          <div className="mt-0.5 text-[26px] font-extrabold leading-tight">
            {daysTo != null && daysTo > 0 ? `${daysTo} hari lagi` : "Segera"}
          </div>
          <div className="text-[12px] text-white/80">Cek utang puasa & siapkan target khatam</div>
        </>
      )}
    </Link>
  );
}
