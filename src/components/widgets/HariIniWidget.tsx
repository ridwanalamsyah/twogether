"use client";

import { BookOpen, Droplets, Moon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useEntries, upsertEntry } from "@/stores/data";
import { isoDay } from "@/lib/dates";
import { hapticTap } from "@/lib/haptic";

const MOOD_OPTIONS: { emoji: string; label: string; value: number }[] = [
  { emoji: "😄", label: "Hebat", value: 5 },
  { emoji: "🙂", label: "Baik", value: 4 },
  { emoji: "😐", label: "Biasa", value: 3 },
  { emoji: "😕", label: "Lelah", value: 2 },
  { emoji: "😢", label: "Sedih", value: 1 },
];

function todayISO(): string {
  return isoDay();
}

export function HariIniWidget() {
  const userId = useAuth((s) => s.userId);
  const reduce = useReducedMotion();
  const water = useEntries(userId, "water") ?? [];
  const moods = useEntries(userId, "mood") ?? [];
  const sleeps = useEntries(userId, "sleep") ?? [];

  const today = todayISO();
  const waterToday = useMemo(
    () =>
      water
        .filter((e) => e.date === today)
        .reduce((sum, e) => sum + (e.valueNum ?? 0), 0),
    [water, today],
  );
  const lastMood = moods[0];
  const sleepLast = sleeps[0];
  const waterPct = Math.min(1, waterToday / 8);

  async function logWater() {
    if (!userId) return;
    hapticTap();
    await upsertEntry(userId, {
      kind: "water",
      date: today,
      valueNum: 1,
    });
  }

  async function logMood(value: number, emoji: string) {
    if (!userId) return;
    hapticTap();
    await upsertEntry(userId, {
      kind: "mood",
      date: today,
      valueNum: value,
      valueText: emoji,
    });
  }

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-text-1">Hari ini</h3>
        <span className="text-[12px] text-text-3">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <motion.button
          type="button"
          onClick={logWater}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          className="relative flex flex-col items-center gap-0.5 overflow-hidden rounded-xl border border-border bg-bg-elev1 p-2.5"
          aria-label="Tambah air minum"
        >
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-[color:var(--info-bg)]"
            initial={false}
            animate={{ height: `${Math.round(waterPct * 100)}%` }}
            transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 320, damping: 28 }}
          />
          <Droplets size={20} className="relative z-10 text-[color:var(--info)]" />
          <span className="relative z-10 tabular-nums text-[15px] font-bold text-text-1">
            {waterToday}
            <span className="text-[11px] font-normal text-text-3">/8</span>
          </span>
          <span className="relative z-10 text-[11px] text-text-3">+1 gelas</span>
        </motion.button>

        <Link
          href="/sehat"
          className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-bg-elev1 p-2.5 transition-transform active:scale-95"
        >
          <Moon size={20} className="text-text-3" />
          <span className="tabular-nums text-[15px] font-bold text-text-1">
            {sleepLast?.valueNum != null ? `${sleepLast.valueNum}j` : "0j"}
          </span>
          <span className="text-[11px] text-text-3">tidur</span>
        </Link>

        <Link
          href="/jadwal"
          className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-bg-elev1 p-2.5 transition-transform active:scale-95"
        >
          <BookOpen size={20} className="text-text-3" />
          <span className="text-[15px] font-bold text-text-1">
            {new Date().getHours() < 18 ? "Cek" : "Esok"}
          </span>
          <span className="text-[11px] text-text-3">jadwal</span>
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between gap-1.5">
        <span className="text-[12px] text-text-3">Mood</span>
        <div className="flex gap-1">
          {MOOD_OPTIONS.map((m) => {
            const active = lastMood?.valueNum === m.value;
            return (
              <motion.button
                key={m.value}
                type="button"
                onClick={() => logMood(m.value, m.emoji)}
                whileTap={reduce ? undefined : { scale: 0.88 }}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elev1 text-base hover:bg-bg-elev2"
                aria-label={m.label}
                aria-pressed={active}
                title={m.label}
              >
                {active && (
                  <motion.span
                    layoutId="hari-ini-mood"
                    className="absolute inset-0 rounded-lg bg-bg-elev2 ring-1 ring-text-1/25"
                    transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 520, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{m.emoji}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
