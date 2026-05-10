"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useEntries, upsertEntry } from "@/stores/data";

const MOOD_OPTIONS: { emoji: string; label: string; value: number }[] = [
  { emoji: "😄", label: "Hebat", value: 5 },
  { emoji: "🙂", label: "Baik", value: 4 },
  { emoji: "😐", label: "Biasa", value: 3 },
  { emoji: "😕", label: "Lelah", value: 2 },
  { emoji: "😢", label: "Sedih", value: 1 },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HariIniWidget() {
  const userId = useAuth((s) => s.userId);
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

  async function logWater() {
    if (!userId) return;
    await upsertEntry(userId, {
      kind: "water",
      date: today,
      valueNum: 1,
    });
  }

  async function logMood(value: number, emoji: string) {
    if (!userId) return;
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
        <span className="text-[11px] text-text-3">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={logWater}
          className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-bg-elev1 p-2.5 active:scale-95"
          aria-label="Tambah air minum"
        >
          <span className="text-xl">💧</span>
          <span className="text-[15px] font-bold text-text-1">
            {waterToday}
            <span className="text-[10px] font-normal text-text-3">/8</span>
          </span>
          <span className="text-[10px] text-text-3">+1 gelas</span>
        </button>

        <Link
          href="/sehat"
          className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-bg-elev1 p-2.5 active:scale-95"
        >
          <span className="text-xl">🌙</span>
          <span className="text-[15px] font-bold text-text-1">
            {sleepLast?.valueNum != null ? `${sleepLast.valueNum}j` : "—"}
          </span>
          <span className="text-[10px] text-text-3">tidur</span>
        </Link>

        <Link
          href="/jadwal"
          className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-bg-elev1 p-2.5 active:scale-95"
        >
          <span className="text-xl">📚</span>
          <span className="text-[15px] font-bold text-text-1">
            {new Date().getHours() < 18 ? "Cek" : "Esok"}
          </span>
          <span className="text-[10px] text-text-3">jadwal</span>
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between gap-1.5">
        <span className="text-[11px] text-text-3">Mood</span>
        <div className="flex gap-1">
          {MOOD_OPTIONS.map((m) => {
            const active = lastMood?.valueNum === m.value;
            return (
              <button
                key={m.value}
                onClick={() => logMood(m.value, m.emoji)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all active:scale-90 ${
                  active
                    ? "bg-accent ring-1 ring-accent"
                    : "bg-bg-elev1 hover:bg-bg-elev2"
                }`}
                aria-label={m.label}
                title={m.label}
              >
                {m.emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
