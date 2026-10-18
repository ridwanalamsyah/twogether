"use client";

import { CalendarHeart, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { upsertItem, useItems } from "@/stores/data";
import { usePeople } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { parsePayload } from "@/lib/payload";
import { daysBetween, isoDay } from "@/lib/dates";
import { hapticTap } from "@/lib/haptic";

interface LdrPayload {
  /** Each person's IANA time zone, filled in by their own phone. */
  zones: Record<string, string>;
  nextMeet?: string;
}

function timeIn(zone: string, now: Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(now);
}

/** Minutes a zone is ahead of UTC right now (handles daylight saving). */
function offsetMinutes(zone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - now.getTime()) / 60_000);
}

/**
 * LDR card: your partner's local time (each phone reports its own zone, no
 * setup) and a countdown to the next time you meet.
 */
export function LdrWidget() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const items = useItems(userId, "ldr");
  // Both phones may create the record before either has synced; read them
  // as one (zones merged, newest meeting date wins) and write to the oldest.
  const sorted = [...(items ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const rec = sorted[0];
  const p = sorted.reduce<LdrPayload>(
    (acc, it) => {
      const q = parsePayload<LdrPayload>(it.payload, { zones: {} });
      return { zones: { ...acc.zones, ...q.zones }, nextMeet: q.nextMeet ?? acc.nextMeet };
    },
    { zones: {} },
  );
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const myZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Tell the other phone which zone this one is in.
  useEffect(() => {
    if (!userId || items === undefined || p.zones[me] === myZone) return;
    void upsertItem(userId, {
      id: rec?.id,
      kind: "ldr",
      title: "LDR",
      payload: JSON.stringify({ ...p, zones: { ...p.zones, [me]: myZone } }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, items === undefined, me, myZone, rec?.id, p.zones[me]]);

  async function setMeet(date: string) {
    if (!userId) return;
    hapticTap();
    await upsertItem(userId, {
      id: rec?.id,
      kind: "ldr",
      title: "LDR",
      payload: JSON.stringify({ ...p, nextMeet: date || undefined }),
    });
    setEditing(false);
  }

  const name = partner ? nick(partner) : "Pasangan";
  const theirZone = partner ? p.zones[partner] : undefined;
  const today = isoDay(now);
  const daysLeft = p.nextMeet ? daysBetween(today, p.nextMeet) : null;
  const diffH = theirZone ? (offsetMinutes(theirZone, now) - offsetMinutes(myZone, now)) / 60 : 0;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bg-elev1 text-text-2">
          <Clock size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-text-3">Jam di tempat {name}</div>
          {theirZone ? (
            <div className="flex items-baseline gap-2">
              <span className="num text-[22px] font-bold text-text-1">{timeIn(theirZone, now)}</span>
              <span className="text-[12px] text-text-3">
                {diffH === 0 ? "sama denganmu" : `${diffH > 0 ? "+" : ""}${diffH} jam dari kamu`}
              </span>
            </div>
          ) : (
            <div className="text-[13px] text-text-3">Muncul setelah {name} membuka app</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-bg-elev1 px-3 py-2.5">
        <CalendarHeart size={18} className="shrink-0 text-accent" />
        {editing ? (
          <input
            type="date"
            autoFocus
            min={today}
            defaultValue={p.nextMeet ?? ""}
            onChange={(e) => e.target.value && void setMeet(e.target.value)}
            onBlur={() => setEditing(false)}
            className="input-base h-9 flex-1 text-[14px]"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left">
            {daysLeft === null || daysLeft < 0 ? (
              <span className="text-[14px] font-semibold text-text-2">Atur tanggal ketemu berikutnya</span>
            ) : daysLeft === 0 ? (
              <span className="text-[15px] font-bold text-text-1">Hari ini ketemu!</span>
            ) : (
              <span className="text-[15px] font-bold text-text-1">
                {daysLeft} hari lagi ketemu
                <span className="ml-1.5 text-[12px] font-medium text-text-3">· ubah</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
