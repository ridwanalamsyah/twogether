"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useEntries, useItems } from "@/stores/data";
import { useShalatPrefs } from "@/stores/shalat";
import { PRAYERS, fmtTime, nextPrayer } from "@/lib/prayer";
import { computeCycle, DEFAULT_CYCLE_SETTINGS, PHASE_COPY, type CycleSettings } from "@/lib/cycle";
import { splitBalance } from "@/lib/split";
import { usePeople, parsePayload, isoDay } from "@/lib/people";
import { formatRupiah } from "@/lib/utils";

/** Next prayer + today's 5-dot progress. */
export function ShalatWidget() {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const place = useShalatPrefs();
  const logs = useEntries(userId, "shalat") ?? [];
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const next = nextPrayer(place.lat, place.lng, now);
  const today = isoDay(now);
  const done = new Set(logs.filter((l) => l.date === today && (l.who || me) === me).map((l) => l.valueText));
  const mins = Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60000));
  return (
    <Link
      href="/shalat"
      className="pressable block rounded-[22px] p-4 text-white shadow-float"
      style={{ background: "linear-gradient(135deg,#0f7a5c,#1fae84)" }}
    >
      <div className="text-[12px] font-semibold text-white/85">🕌 {next.name} berikutnya</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-extrabold leading-none">{fmtTime(next.at)}</span>
        <span className="text-[12px] text-white/80">
          {mins >= 60 ? `${Math.floor(mins / 60)}j ${mins % 60}m lagi` : `${mins} menit lagi`}
        </span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {PRAYERS.map((p) => (
          <span
            key={p.id}
            className={`h-1.5 flex-1 rounded-full ${done.has(p.id) ? "bg-white" : "bg-white/30"}`}
            title={p.name}
          />
        ))}
      </div>
    </Link>
  );
}

/** Cycle phase — mine, or the partner's when they share it. */
export function SiklusWidget() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const entries = useEntries(userId, "cycle") ?? [];
  const settingsItems = useItems(userId, "cycle-settings") ?? [];
  const owners = Array.from(new Set(entries.map((e) => e.who || me)));
  const who = owners.includes(me) ? me : owners[0] ?? me;
  const settings = parsePayload<CycleSettings>(
    settingsItems.find((i) => (i.who || me) === who)?.payload,
    DEFAULT_CYCLE_SETTINGS,
  );
  const hidden = who !== me && !settings.shareWithPartner;
  const state = computeCycle(entries.filter((e) => (e.who || me) === who), settings);
  const copy = PHASE_COPY[state.phase];
  return (
    <Link href="/siklus" className="pressable surface block p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-[22px]">
          {hidden ? "🤍" : copy.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-text-3">
            {who === me ? "Siklusku" : `Siklus ${who ?? partner}`}
          </div>
          <div className="text-[15px] font-bold text-text-1">
            {hidden
              ? "Tidak dibagikan"
              : state.phase === "haid"
                ? `Haid hari ke-${state.dayOfCycle}`
                : state.daysUntilNext != null
                  ? `${copy.label} · haid ${state.daysUntilNext > 0 ? `${state.daysUntilNext} hari lagi` : "sebentar lagi"}`
                  : copy.label}
          </div>
          {!hidden && state.phase !== "belum" && (
            <div className="mt-0.5 line-clamp-1 text-[12px] text-text-3">{who === me ? copy.self : copy.partner}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Who owes whom. */
export function PatunganWidget() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const splits = useEntries(userId, "split") ?? [];
  const settles = useEntries(userId, "split-settle") ?? [];
  const net = splitBalance([...splits, ...settles], me);
  const other = partner ?? "Pasangan";
  return (
    <Link href="/patungan" className="pressable surface flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-2xl text-[22px]" style={{ background: "color-mix(in srgb,#f59e0b 16%,transparent)" }}>
        🤝
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-text-3">Patungan</div>
        <div className="text-[15px] font-bold text-text-1">
          {net === 0 ? "Impas 🎉" : net > 0 ? `${other} perlu ganti ${formatRupiah(net)}` : `Kamu perlu ganti ${formatRupiah(-net)}`}
        </div>
      </div>
      <span className="text-text-4">›</span>
    </Link>
  );
}
