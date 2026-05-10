"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useEntries, upsertEntry } from "@/stores/data";
import { hapticTap } from "@/lib/haptic";

const MOODS: { emoji: string; label: string; value: number }[] = [
  { emoji: "😄", label: "Hebat", value: 5 },
  { emoji: "🙂", label: "Baik", value: 4 },
  { emoji: "😐", label: "Biasa", value: 3 },
  { emoji: "😕", label: "Lelah", value: 2 },
  { emoji: "😢", label: "Sedih", value: 1 },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SehatQuickWidget() {
  const userId = useAuth((s) => s.userId);
  const water = useEntries(userId, "water") ?? [];
  const moods = useEntries(userId, "mood") ?? [];
  const weights = useEntries(userId, "weight") ?? [];
  const sleeps = useEntries(userId, "sleep") ?? [];

  const today = todayISO();
  const waterToday = useMemo(
    () =>
      water
        .filter((e) => e.date === today)
        .reduce((s, e) => s + (e.valueNum ?? 0), 0),
    [water, today],
  );
  const moodToday = useMemo(
    () => moods.find((e) => e.date === today),
    [moods, today],
  );
  const lastWeight = weights[0];
  const lastSleep = sleeps[0];

  const [showWeight, setShowWeight] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  async function logWater(delta: number) {
    if (!userId) return;
    hapticTap();
    if (delta > 0) {
      await upsertEntry(userId, { kind: "water", date: today, valueNum: 1 });
      return;
    }
    const todays = water.filter((e) => e.date === today);
    if (todays.length === 0) return;
    const last = todays[todays.length - 1];
    if (!last) return;
    await upsertEntry(userId, {
      id: last.id,
      kind: "water",
      date: today,
      valueNum: 0,
    });
  }

  async function logMood(value: number, emoji: string) {
    if (!userId) return;
    hapticTap();
    await upsertEntry(userId, {
      id: moodToday?.id,
      kind: "mood",
      date: today,
      valueNum: value,
      valueText: emoji,
    });
  }

  async function saveWeight() {
    if (!userId) return;
    const v = parseFloat(weightInput);
    if (!Number.isFinite(v) || v <= 0) return;
    hapticTap();
    await upsertEntry(userId, {
      kind: "weight",
      date: today,
      valueNum: v,
    });
    setWeightInput("");
    setShowWeight(false);
  }

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">💧</span>
          <h3 className="text-[13px] font-semibold text-text-1">Sehat</h3>
        </div>
        <Link href="/sehat" className="text-[11px] text-text-3 active:opacity-60">
          Detail ›
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-bg-elev1 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-3">Air minum hari ini</span>
          <span className="font-mono text-[13px] font-bold text-text-1">
            {waterToday}
            <span className="text-[10px] font-normal text-text-3">/8 gelas</span>
          </span>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-bg-elev2">
          <div
            className="h-full bg-sky-400 transition-all"
            style={{ width: `${Math.min(100, (waterToday / 8) * 100)}%` }}
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => logWater(-1)}
            disabled={waterToday === 0}
            className="flex-1 rounded-md border border-border bg-bg-app py-1.5 text-[12px] font-medium text-text-2 active:scale-95 disabled:opacity-40"
          >
            − gelas
          </button>
          <button
            onClick={() => logWater(1)}
            className="flex-[2] rounded-md bg-sky-500 py-1.5 text-[12px] font-semibold text-white active:scale-95"
          >
            + 1 gelas
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1">
        {MOODS.map((m) => {
          const active = moodToday?.valueNum === m.value;
          return (
            <button
              key={m.value}
              onClick={() => logMood(m.value, m.emoji)}
              className={`flex flex-col items-center gap-0.5 rounded-lg p-2 transition-all active:scale-90 ${
                active ? "bg-bg-elev2 ring-1 ring-text-1" : "bg-bg-elev1"
              }`}
              aria-label={m.label}
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="text-[9px] font-medium text-text-3">
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowWeight((v) => !v)}
          className="flex items-center justify-between rounded-lg border border-border bg-bg-elev1 px-2.5 py-2 active:scale-95"
        >
          <span className="text-base">⚖️</span>
          <div className="text-right">
            <div className="text-[12px] font-semibold text-text-1">
              {lastWeight?.valueNum != null ? `${lastWeight.valueNum} kg` : "Catat"}
            </div>
            <div className="text-[9px] text-text-3">berat</div>
          </div>
        </button>
        <Link
          href="/sehat"
          className="flex items-center justify-between rounded-lg border border-border bg-bg-elev1 px-2.5 py-2 active:scale-95"
        >
          <span className="text-base">🌙</span>
          <div className="text-right">
            <div className="text-[12px] font-semibold text-text-1">
              {lastSleep?.valueNum != null ? `${lastSleep.valueNum}j` : "—"}
            </div>
            <div className="text-[9px] text-text-3">tidur</div>
          </div>
        </Link>
      </div>

      {showWeight && (
        <div className="mt-2 flex gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="input-base flex-1 text-sm"
            autoFocus
          />
          <button
            onClick={saveWeight}
            disabled={!weightInput}
            className="rounded-md bg-text-1 px-3 text-[12px] font-semibold text-bg-app disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      )}
    </div>
  );
}
