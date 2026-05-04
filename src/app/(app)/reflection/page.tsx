"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import {
  deleteReflection,
  upsertReflection,
  useReflections,
} from "@/stores/data";
import type { ReflectionRecord } from "@/lib/db";
import { formatDateShort, todayISO } from "@/lib/utils";

const MOODS: { id: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { id: 1, emoji: "😞", label: "Berat" },
  { id: 2, emoji: "😕", label: "Biasa-" },
  { id: 3, emoji: "😐", label: "Netral" },
  { id: 4, emoji: "🙂", label: "Baik" },
  { id: 5, emoji: "🤩", label: "Luar biasa" },
];

export default function ReflectionPage() {
  const userId = useAuth((s) => s.userId);
  const name = useAuth((s) => s.name);
  const reflections = useReflections(userId);
  const members = useWorkspace((s) => s.members);
  const [who, setWho] = useState(name ?? "Saya");

  const today = todayISO();
  const todayEntry = useMemo(() => {
    return (reflections ?? []).find(
      (r) => r.date === today && (r.who ?? name) === who,
    );
  }, [reflections, today, who, name]);

  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(
    (todayEntry?.mood ?? 3) as 1 | 2 | 3 | 4 | 5,
  );
  const [highlights, setHighlights] = useState(todayEntry?.highlights ?? "");

  async function save() {
    if (!userId) return;
    await upsertReflection(userId, {
      id: todayEntry?.id,
      date: today,
      mood,
      highlights,
      who,
    });
  }

  const weeklyAvg = useMemo(() => {
    const since = Date.now() - 7 * 864e5;
    const recent = (reflections ?? []).filter(
      (r) => new Date(r.date).getTime() >= since,
    );
    if (recent.length === 0) return null;
    return (
      recent.reduce((a, r) => a + r.mood, 0) / recent.length
    ).toFixed(1);
  }, [reflections]);

  return (
    <div className="animate-in">
      <AppHeader title="Refleksi" />

      <div className="px-5 pt-4 pb-8">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[28px] font-semibold tracking-tight text-text-1">
            {weeklyAvg ?? "—"}
          </span>
          <span className="text-[11px] text-text-3">rata-rata mood (7 hari)</span>
        </div>

        {members.length > 1 && (
          <div className="mt-4 flex gap-4 overflow-x-auto border-b border-border text-xs no-scrollbar">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setWho(m.name)}
                className={`-mb-px border-b pb-2 font-medium transition-colors ${
                  who === m.name
                    ? "border-text-1 text-text-1"
                    : "border-transparent text-text-4"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
            Mood · {formatDateShort(today)}
          </div>
          <div className="flex justify-between">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 transition-colors ${
                  mood === m.id ? "bg-bg-elev2" : ""
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-text-4">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
            3 highlight
          </div>
          <textarea
            className="input-base min-h-[100px]"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder="1. …&#10;2. …&#10;3. …"
          />
          <button onClick={save} className="btn-accent mt-3 w-full text-sm">
            {todayEntry ? "Perbarui" : "Simpan"}
          </button>
        </div>

        <HistoryList items={reflections ?? []} />
      </div>
    </div>
  );
}

function HistoryList({ items }: { items: ReflectionRecord[] }) {
  const userId = useAuth((s) => s.userId);
  return (
    <div className="mt-6">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
        Histori
      </div>
      {items.length === 0 ? (
        <div className="text-[12px] text-text-4">
          Belum ada refleksi minggu ini.
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {items.slice(0, 20).map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 text-base">
                {MOODS.find((m) => m.id === r.mood)?.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold text-text-2">
                    {formatDateShort(r.date)}
                  </span>
                  {r.who && (
                    <span className="text-[10px] text-text-4">{r.who}</span>
                  )}
                </div>
                {r.highlights && (
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-text-2">
                    {r.highlights}
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  userId && void deleteReflection(userId, r.id)
                }
                className="text-xs text-text-4"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
