"use client";

import { ChevronRight, Droplets, Moon, Scale } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useEntries, upsertEntry } from "@/stores/data";
import { hapticTap } from "@/lib/haptic";
import { isoDay } from "@/lib/dates";

const MOODS: { emoji: string; label: string; value: number }[] = [
  { emoji: "😄", label: "Hebat", value: 5 },
  { emoji: "🙂", label: "Baik", value: 4 },
  { emoji: "😐", label: "Biasa", value: 3 },
  { emoji: "😕", label: "Lelah", value: 2 },
  { emoji: "😢", label: "Sedih", value: 1 },
];

function todayISO(): string {
  return isoDay();
}

export function SehatQuickWidget() {
  const userId = useAuth((s) => s.userId);
  const reduced = useReducedMotion();
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
          <Droplets size={16} className="text-[color:var(--info)]" />
          <h3 className="text-[14px] font-semibold text-text-1">Sehat</h3>
        </div>
        <Link href="/sehat" className="flex items-center gap-0.5 text-[12px] font-medium text-text-3 active:opacity-60">
          Lihat <ChevronRight size={14} />
        </Link>
      </div>

      <div className="border-b border-[color:var(--hairline)] pb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-medium text-text-3">Air minum hari ini</span>
          <span className="text-[13px] font-bold tabular-nums text-text-1">
            {waterToday}
            <span className="text-[11px] font-normal text-text-3">/8 gelas</span>
          </span>
        </div>
        <div className="mb-2.5 h-2 overflow-hidden rounded-full bg-bg-elev2">
          <motion.div
            className="h-full rounded-full bg-[color:var(--info)]"
            initial={false}
            animate={{ width: `${Math.min(100, (waterToday / 8) * 100)}%` }}
            transition={{ duration: reduced ? 0 : 0.24, ease: "easeOut" }}
          />
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => logWater(-1)}
            disabled={waterToday === 0}
            className="flex-1 rounded-lg border border-border bg-bg-app py-1.5 text-[12px] font-medium text-text-2 transition-transform active:scale-95 disabled:opacity-40"
          >
            − gelas
          </button>
          <button
            type="button"
            onClick={() => logWater(1)}
            className="flex-[2] rounded-lg bg-accent py-1.5 text-[12px] font-semibold text-accent-fg transition-transform active:scale-95"
          >
            + 1 gelas
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1">
        {MOODS.map((m) => {
          const active = moodToday?.valueNum === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => logMood(m.value, m.emoji)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-2 transition-transform active:scale-90 ${
                active ? "bg-bg-elev2 ring-1 ring-text-1" : "bg-bg-elev1"
              }`}
              aria-label={m.label}
            >
              <span className="text-lg">{m.emoji}</span>
              <span className={`text-[11px] font-medium ${active ? "text-text-1" : "text-text-3"}`}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 grid grid-cols-2 divide-x divide-[color:var(--hairline)] border-t border-[color:var(--hairline)] pt-2.5">
        <button
          type="button"
          onClick={() => setShowWeight((v) => !v)}
          aria-expanded={showWeight}
          className="flex items-center justify-between pr-3 transition-transform active:scale-95"
        >
          <Scale size={16} className="text-text-3" />
          <div className="text-right">
            <div className="text-[13px] font-semibold tabular-nums text-text-1">
              {lastWeight?.valueNum != null ? `${Math.round(lastWeight.valueNum * 10) / 10} kg` : "Catat"}
            </div>
            <div className="text-[11px] text-text-3">berat</div>
          </div>
        </button>
        <Link
          href="/sehat"
          className="flex items-center justify-between pl-3 transition-transform active:scale-95"
        >
          <Moon size={16} className="text-text-3" />
          <div className="text-right">
            <div className="text-[13px] font-semibold tabular-nums text-text-1">
              {lastSleep?.valueNum != null ? `${Math.round(lastSleep.valueNum * 10) / 10}j` : "0j"}
            </div>
            <div className="text-[11px] text-text-3">tidur</div>
          </div>
        </Link>
      </div>

      <AnimatePresence initial={false}>
        {showWeight && (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 flex gap-1.5 pt-0.5">
              <input
                type="number"
                inputMode="decimal"
                placeholder="kg"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveWeight()}
                className="input-base flex-1 text-sm tabular-nums"
                autoFocus
              />
              <button
                type="button"
                onClick={saveWeight}
                disabled={!weightInput}
                className="btn-accent rounded-lg px-3.5 text-[12px] disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
