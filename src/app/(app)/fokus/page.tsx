"use client";

import { useNick } from "@/lib/nick";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { upsertEntry, useEntries } from "@/stores/data";
import { usePeople, parsePayload, isoDay, addDays, fromIsoDay } from "@/lib/people";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";
import type { EntryRecord } from "@/lib/db";

interface FokusPayload {
  start: number;
  minutes: number;
  status: "run" | "done" | "stop";
  actual?: number;
  with?: string;
}
const EMPTY: FokusPayload = { start: 0, minutes: 25, status: "done" };
const PRESETS = [25, 50, 90];

function endOf(p: FokusPayload) {
  return p.start + p.minutes * 60_000;
}
/** Minutes actually focused; a running session past its end counts as done. */
function focusedMinutes(e: EntryRecord, now: number) {
  const p = parsePayload(e.payload, EMPTY);
  if (p.status === "stop") return p.actual ?? 0;
  if (p.status === "run" && now < endOf(p)) return Math.floor((now - p.start) / 60_000);
  return p.minutes;
}
function isRunning(e: EntryRecord, now: number) {
  const p = parsePayload(e.payload, EMPTY);
  return p.status === "run" && now < endOf(p);
}
function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function FokusPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const partnerName = partner ? nick(partner) : null;
  const sessions = useEntries(userId, "fokus") ?? [];
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(25);
  const [task, setTask] = useState("");
  const [justDone, setJustDone] = useState(false);
  const celebrated = useRef<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const mine = sessions.filter((s) => (s.who || me) === me).sort((a, b) => b.createdAt - a.createdAt);
  const theirs = sessions.filter((s) => (s.who || me) !== me).sort((a, b) => b.createdAt - a.createdAt);
  const myActive = mine.find((s) => isRunning(s, now));
  const partnerActive = theirs.find((s) => isRunning(s, now));
  const myP = myActive ? parsePayload(myActive.payload, EMPTY) : null;
  const partnerP = partnerActive ? parsePayload(partnerActive.payload, EMPTY) : null;

  // Celebrate when my running session reaches its end while the page is open.
  const lastMine = mine[0];
  useEffect(() => {
    if (!lastMine) return;
    const p = parsePayload(lastMine.payload, EMPTY);
    if (p.status !== "run" || now < endOf(p) || now - endOf(p) > 5000) return;
    if (celebrated.current === lastMine.id) return;
    celebrated.current = lastMine.id;
    hapticSuccess();
    konfetti();
    setJustDone(true);
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      void navigator.serviceWorker?.getRegistration().then((reg) =>
        reg?.showNotification("⏰ Fokus selesai", { body: "Waktunya istirahat sebentar.", tag: "fokus", icon: "/icons/icon-192.png" }),
      );
    }
  }, [now, lastMine]);

  async function start(mins: number, withId?: string, startAt = Date.now()) {
    if (!userId) return;
    setJustDone(false);
    await upsertEntry(userId, {
      kind: "fokus",
      date: isoDay(new Date()),
      who: me,
      valueNum: mins,
      valueText: task.trim() || undefined,
      payload: JSON.stringify({ start: startAt, minutes: mins, status: "run", with: withId } satisfies FokusPayload),
    });
    hapticTap();
  }

  async function join() {
    if (!partnerActive || !partnerP) return;
    const remaining = Math.max(1, Math.round((endOf(partnerP) - Date.now()) / 60_000));
    await start(remaining, partnerActive.id);
  }

  async function stop() {
    if (!userId || !myActive || !myP) return;
    const actual = Math.floor((Date.now() - myP.start) / 60_000);
    await upsertEntry(userId, {
      ...myActive,
      valueNum: actual,
      payload: JSON.stringify({ ...myP, status: "stop", actual } satisfies FokusPayload),
    });
  }

  // Stats.
  const today = isoDay(new Date());
  const sumFor = (list: EntryRecord[], date: string) =>
    list.filter((s) => s.date === date).reduce((a, s) => a + focusedMinutes(s, now), 0);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekMine = week.map((d) => sumFor(mine, d));
  const weekTheirs = week.map((d) => sumFor(theirs, d));
  const maxDay = Math.max(30, ...weekMine, ...weekTheirs);
  const together = mine.filter((s) => {
    const p = parsePayload(s.payload, EMPTY);
    return !!p.with && s.date >= week[0];
  }).length;

  const remaining = myP ? endOf(myP) - now : 0;
  const pct = myP ? 1 - remaining / (myP.minutes * 60_000) : 0;
  const r = 92;
  const c = 2 * Math.PI * r;

  return (
    <div>
      <AppHeader title="Fokus bareng" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        {partner && partnerP && (
          <div className="surface flex items-center gap-3 p-4">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-[18px]">
              🎧
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-[color:var(--positive)] ring-2 ring-bg-card" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold text-text-1">{partnerName} lagi fokus</div>
              <div className="truncate text-[12px] text-text-3">
                {partnerActive?.valueText ? `${partnerActive.valueText} · ` : ""}sisa {mmss(endOf(partnerP) - now)}
              </div>
            </div>
            {!myP && (
              <button onClick={join} className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-bold text-accent-fg">
                Ikut
              </button>
            )}
          </div>
        )}

        <div className="surface flex flex-col items-center p-6">
          <div className="relative grid h-[210px] w-[210px] place-items-center">
            <svg viewBox="0 0 210 210" className="absolute inset-0 -rotate-90">
              <circle cx="105" cy="105" r={r} fill="none" stroke="var(--bg-elev2)" strokeWidth="12" />
              <circle
                cx="105"
                cy="105"
                r={r}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct)}
                style={{ transition: "stroke-dashoffset 900ms linear" }}
              />
            </svg>
            <div className="text-center">
              <div className="font-mono text-[44px] font-extrabold tabular-nums leading-none text-text-1">
                {myP ? mmss(remaining) : `${String(minutes).padStart(2, "0")}:00`}
              </div>
              <div className="mt-2 max-w-[150px] truncate text-[12px] text-text-3">
                {myP ? myActive?.valueText || (myP.with ? `Bareng ${partnerName}` : "Fokus…") : justDone ? "Selesai! Istirahat 5 menit ☕" : "Siap?"}
              </div>
            </div>
          </div>

          {myP ? (
            <button onClick={stop} className="mt-5 w-full rounded-full bg-bg-elev2 py-3 text-[15px] font-bold text-text-2">
              Berhenti
            </button>
          ) : (
            <>
              <div className="mt-5 flex gap-2">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`rounded-full px-4 py-2 text-[13px] font-bold ${minutes === m ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-2"}`}
                  >
                    {m} mnt
                  </button>
                ))}
              </div>
              <input
                className="input-base mt-3"
                placeholder="Mau ngerjain apa? (opsional)"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
              <button onClick={() => start(minutes)} className="btn-accent mt-3 w-full">
                Mulai fokus
              </button>
              {partner && !partnerP && (
                <p className="mt-2 text-center text-[12px] text-text-4">{partnerName} akan lihat kamu sedang fokus dan bisa ikut.</p>
              )}
            </>
          )}
        </div>

        <div className="surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold text-text-1">7 hari terakhir</h2>
            {together > 0 && <span className="text-[12px] text-text-3">{together}× fokus bareng</span>}
          </div>
          <div className="flex h-28 items-end gap-2">
            {week.map((d, i) => (
              <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="flex h-full w-full items-end justify-center gap-[2px]">
                  <span
                    title={`Kamu ${weekMine[i]} mnt`}
                    className="w-full max-w-[12px] rounded-t-[4px] bg-accent"
                    style={{ height: `${(weekMine[i] / maxDay) * 100}%` }}
                  />
                  {partner && (
                    <span
                      title={`${partnerName} ${weekTheirs[i]} mnt`}
                      className="w-full max-w-[12px] rounded-t-[4px]"
                      style={{ height: `${(weekTheirs[i] / maxDay) * 100}%`, background: "color-mix(in srgb, var(--accent) 40%, var(--bg-elev2))" }}
                    />
                  )}
                </div>
                <span className={`text-[10px] ${d === today ? "font-bold text-text-1" : "text-text-4"}`}>
                  {fromIsoDay(d).toLocaleDateString("id-ID", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[12px] text-text-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Kamu · hari ini {sumFor(mine, today)} mnt
            </span>
            {partner && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent) 40%, var(--bg-elev2))" }} /> {partnerName} · {sumFor(theirs, today)} mnt
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
