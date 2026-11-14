"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { Sheet } from "@/components/ui/Sheet";

const BUCKETS = ["Pagi", "Siang", "Sore", "Malam", "Seharian"];

export default function HabitsPage() {
  const userId = useAuth((s) => s.userId);
  const name = useAuth((s) => s.name);
  const reduce = useReducedMotion();
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
        title="Kebiasaan"
        actions={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="min-h-[44px] rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg"
          >
            + Baru
          </button>
        }
      />

      <div className="px-5 pt-4 pb-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[28px] font-semibold tracking-tight tabular-nums text-text-1">
            {progress}%
          </span>
          <span className="text-[12px] text-text-3">selesai hari ini</span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
          <motion.div
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            transition={reduce ? { duration: 0.05 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full rounded-full bg-accent"
            style={{ originX: 0 }}
          />
        </div>

        {members.length > 1 && (
          <div className="mt-4 flex gap-4 overflow-x-auto border-b border-border text-xs no-scrollbar">
            {members.map((m) => {
              const active = who === m.name;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setWho(m.name)}
                  className={`relative -mb-px min-h-[44px] flex-shrink-0 pb-2 font-medium transition-colors ${
                    active ? "text-text-1" : "text-text-4"
                  }`}
                >
                  {m.name}
                  {active && (
                    <motion.span
                      layoutId="habit-member"
                      className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-text-1"
                      transition={reduce ? { duration: 0.05 } : { type: "spring", stiffness: 520, damping: 36 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 space-y-5">
        {BUCKETS.map((b) => {
          const items = (habits ?? []).filter((h) => h.bucket === b);
          if (items.length === 0) return null;
          return (
            <section key={b}>
              <div className="mb-2 text-[12px] font-medium section-label text-text-4">
                {b}
              </div>
              <ul className="list-card">
                {items.map((h) => {
                  const isDone = doneMap.get(h.id) === 1;
                  return (
                    <li key={h.id} className="group flex items-center gap-1 py-1.5">
                      <button
                        type="button"
                        aria-label={`Tandai ${h.label}`}
                        aria-pressed={isDone}
                        onClick={() =>
                          userId &&
                          void toggleHabitLog(userId, h.id, today, who)
                        }
                        className="-ml-2 grid h-11 w-11 flex-shrink-0 place-items-center"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-sm border transition-colors ${
                            isDone
                              ? "border-accent bg-accent text-accent-fg"
                              : "border-border-strong"
                          }`}
                        >
                          {isDone && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                              <path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </button>
                      <span
                        className={`flex-1 truncate text-[14px] ${
                          isDone ? "text-text-4 line-through" : "text-text-1"
                        }`}
                      >
                        {h.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing(h)}
                        className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-[12px] text-text-4 transition-colors hover:text-text-1"
                      >
                        Ubah
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
            title="Bikin satu habit kecil dulu"
            body="Mulai dari yang gampang, seperti minum air, jalan 10 menit, atau baca 1 halaman."
          />
        )}
      </div>

      <AnimatePresence>
        {(showAdd || editing) && (
          <HabitSheet
            key={editing ? editing.id : "new-habit"}
            record={editing}
            onClose={() => {
              setEditing(null);
              setShowAdd(false);
            }}
          />
        )}
      </AnimatePresence>
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
    <Sheet title={record ? "Edit habit" : "Tambah habit"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <div className="mb-1 text-[12px] font-bold section-label text-text-3">
            Kebiasaan
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
          <div className="mb-1 text-[12px] font-bold section-label text-text-3">
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
          <button type="button" onClick={save} className="btn-accent min-h-[48px] flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button type="button" onClick={del} className="btn-danger min-h-[48px] text-sm">
              Hapus
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
