"use client";

import { useNick } from "@/lib/nick";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
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

const MOODS: { id: 1 | 2 | 3 | 4 | 5; code: string; label: string }[] = [
  { id: 1, code: "1", label: "Berat" },
  { id: 2, code: "2", label: "Kurang" },
  { id: 3, code: "3", label: "Netral" },
  { id: 4, code: "4", label: "Baik" },
  { id: 5, code: "5", label: "Hebat" },
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
  const [savedNotice, setSavedNotice] = useState(false);

  async function save() {
    if (!userId) return;
    await upsertReflection(userId, {
      id: todayEntry?.id,
      date: today,
      mood,
      highlights,
      who,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
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
          <span className="tabular-nums text-[28px] font-semibold tracking-tight text-text-1">
            {weeklyAvg ?? "-"}
          </span>
          <span className="text-[12px] text-text-3">rata-rata mood (7 hari)</span>
        </div>

        {members.length > 1 && (
          <div role="tablist" aria-label="Pilih anggota" className="mt-4 flex gap-3 overflow-x-auto border-b border-border text-[13px] no-scrollbar">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={who === m.name}
                onClick={() => setWho(m.name)}
                className={`-mb-px min-h-[44px] border-b-2 px-1 pb-2 font-medium transition-colors ${
                  who === m.name
                    ? "border-accent text-text-1"
                    : "border-transparent text-text-3"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 text-[12px] font-medium section-label text-text-4">
            Mood · {formatDateShort(today)}
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Pilih mood hari ini">
            {MOODS.map((m) => {
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMood(m.id)}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 transition-colors active:scale-95 ${
                    active ? "border-accent bg-accent-soft text-accent" : "border-border bg-bg-card text-text-2"
                  }`}
                >
                  <span className="text-[16px] font-extrabold tabular-nums leading-none">{m.code}</span>
                  <span className="text-[12px] font-medium leading-none">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="reflection-highlights" className="mb-2 block text-[12px] font-medium section-label text-text-4">
            3 highlight
          </label>
          <textarea
            id="reflection-highlights"
            className="input-base min-h-[100px]"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder="1. ...&#10;2. ...&#10;3. ..."
          />
          <button type="button" onClick={save} className="btn-accent mt-3 min-h-[44px] w-full text-sm">
            {todayEntry ? "Perbarui" : "Simpan"}
          </button>
          {savedNotice && (
            <div role="status" className="mt-2 rounded-lg bg-positive-bg px-3 py-2 text-[12px] font-medium text-[color:var(--positive)]">
              Refleksi hari ini tersimpan.
            </div>
          )}
        </div>

        <HistoryList items={reflections ?? []} />
      </div>
    </div>
  );
}

function HistoryList({ items }: { items: ReflectionRecord[] }) {
  const { nick } = useNick();
  const userId = useAuth((s) => s.userId);
  return (
    <div className="mt-6">
      <div className="mb-2 text-[12px] font-medium section-label text-text-4">
        Histori
      </div>
      {items.length === 0 ? (
        <div className="text-[12px] text-text-3">
          Belum ada refleksi minggu ini.
        </div>
      ) : (
        <ul className="list-card">
          {items.slice(0, 20).map((r) => {
            const moodMeta = MOODS.find((m) => m.id === r.mood);
            return (
              <li key={r.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg-elev2 text-[13px] font-bold tabular-nums text-text-1" title={moodMeta?.label}>
                  {r.mood}/5
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-text-2">
                      {formatDateShort(r.date)} · {moodMeta?.label ?? ""}
                    </span>
                    {r.who && (
                      <span className="text-[12px] text-text-3">{nick(r.who)}</span>
                    )}
                  </div>
                  {r.highlights && (
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-[13px] text-text-2">
                      {r.highlights}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Hapus refleksi ${formatDateShort(r.date)}`}
                  onClick={() =>
                    userId && void deleteReflection(userId, r.id)
                  }
                  className="grid h-11 w-11 -mr-2 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-bg-elev1 hover:text-text-1 active:scale-95"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
