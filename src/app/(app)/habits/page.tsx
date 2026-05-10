"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import {
  deleteHabit,
  toggleHabitLog,
  upsertHabit,
  useHabitLogsForDate,
  useHabits,
} from "@/stores/data";
import type { HabitRecord } from "@/lib/db";
import { todayISO } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

const BUCKETS = ["Pagi", "Siang", "Sore", "Malam", "Seharian"];

export default function HabitsPage() {
  const userId = useAuth((s) => s.userId);
  const name = useAuth((s) => s.name);
  const habits = useHabits(userId);
  const today = todayISO();
  const logs = useHabitLogsForDate(userId, today);
  const members = useWorkspace((s) => s.members);
  const [who, setWho] = useState(name ?? "Saya");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<HabitRecord | null>(null);

  const doneMap = useMemo(() => {
    const map = new Map<string, 0 | 1>();
    for (const l of logs ?? []) {
      if ((l.who ?? name) === who) {
        map.set(l.habitId, l.done);
      }
    }
    return map;
  }, [logs, who, name]);

  const progress = useMemo(() => {
    const total = (habits ?? []).length;
    if (total === 0) return 0;
    let done = 0;
    for (const h of habits ?? []) {
      if (doneMap.get(h.id) === 1) done += 1;
    }
    return Math.round((done / total) * 100);
  }, [habits, doneMap]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Habits"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg"
          >
            Habit
          </button>
        }
      />

      <div className="px-5 pt-4 pb-8">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[28px] font-semibold tracking-tight text-text-1">
            {progress}%
          </span>
          <span className="text-[11px] text-text-3">selesai hari ini</span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {members.length > 1 && (
          <div className="mt-4 flex gap-4 overflow-x-auto border-b border-border text-xs no-scrollbar">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setWho(m.name)}
                className={`flex-shrink-0 -mb-px border-b pb-2 font-medium transition-colors ${
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

        <div className="mt-4 space-y-5">
        {BUCKETS.map((b) => {
          const items = (habits ?? []).filter((h) => h.bucket === b);
          if (items.length === 0) return null;
          return (
            <section key={b}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
                {b}
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {items.map((h) => {
                  const isDone = doneMap.get(h.id) === 1;
                  return (
                    <li key={h.id} className="group flex items-center gap-3 py-2.5">
                      <button
                        onClick={() =>
                          userId &&
                          void toggleHabitLog(userId, h.id, today, who)
                        }
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border transition-colors ${
                          isDone
                            ? "border-accent bg-accent text-accent-fg"
                            : "border-border-strong"
                        }`}
                      >
                        {isDone && (
                          <svg viewBox="0 0 12 12" className="h-3 w-3">
                            <path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`flex-1 truncate text-[13px] ${
                          isDone ? "text-text-4 line-through" : "text-text-1"
                        }`}
                      >
                        {h.label}
                      </span>
                      <button
                        onClick={() => setEditing(h)}
                        className="text-[11px] text-text-4 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Edit
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        </div>

        {(habits ?? []).length === 0 && (
          <EmptyState
            emoji="✅"
            title="Bikin satu habit kecil dulu"
            body="Mulai dari yang gampang — minum air, jalan 10 menit, baca 1 halaman. Konsistensi pelan-pelan."
          />
        )}
      </div>

      {(showAdd || editing) && (
        <HabitSheet
          record={editing}
          onClose={() => {
            setEditing(null);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function HabitSheet({
  record,
  onClose,
}: {
  record: HabitRecord | null;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const [label, setLabel] = useState(record?.label ?? "");
  const [bucket, setBucket] = useState(record?.bucket ?? "Pagi");

  async function save() {
    if (!userId || !label.trim()) return;
    await upsertHabit(userId, { id: record?.id, label, bucket });
    onClose();
  }

  async function del() {
    if (!userId || !record) return;
    if (!confirm("Hapus habit?")) return;
    await deleteHabit(userId, record.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(96px+var(--sab))] slide-up theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {record ? "Edit habit" : "Tambah habit"}
          </h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-3">
              Habit
            </div>
            <input
              className="input-base"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="misal: Baca 10 halaman buku"
              autoFocus
            />
          </label>
          <label className="block">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-3">
              Waktu
            </div>
            <select
              className="input-base"
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
            >
              {BUCKETS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="btn-accent flex-1 text-sm">
              Simpan
            </button>
            {record && (
              <button onClick={del} className="btn-danger text-sm">
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
