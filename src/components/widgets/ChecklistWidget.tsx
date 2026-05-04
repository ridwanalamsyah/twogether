"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/stores/auth";
import {
  useChecklists,
  upsertChecklist,
  deleteChecklist,
} from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { todayISO } from "@/lib/utils";

export function ChecklistWidget() {
  const userId = useAuth((s) => s.userId);
  const items = useChecklists(userId);
  const [draft, setDraft] = useState("");

  const today = todayISO();
  const todays = useMemo(
    () => (items ?? []).filter((i) => i.date === today),
    [items, today],
  );
  const done = todays.filter((i) => i.done).length;

  async function add() {
    if (!userId || !draft.trim()) return;
    await upsertChecklist(userId, {
      id: undefined,
      title: draft.trim(),
      done: 0,
      date: today,
    });
    setDraft("");
  }

  async function toggle(id: string, current: 0 | 1) {
    if (!userId) return;
    const item = todays.find((i) => i.id === id);
    if (!item) return;
    await upsertChecklist(userId, {
      id: item.id,
      title: item.title,
      date: item.date,
      done: current ? 0 : 1,
    });
  }

  return (
    <WidgetShell
      title="Hari ini"
      action={
        <span className="font-mono text-[11px] tabular-nums text-text-3">
          {done}/{todays.length}
        </span>
      }
    >
      <div className="space-y-0.5">
        {todays.map((i) => (
          <div key={i.id} className="group flex items-center gap-2.5 py-1">
            <button
              onClick={() => toggle(i.id, i.done)}
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border transition-colors ${
                i.done
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border-strong"
              }`}
              aria-label={i.done ? "Tandai belum" : "Tandai selesai"}
            >
              {i.done ? (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                  <path
                    d="M2 6l3 3 5-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </button>
            <span
              className={`flex-1 truncate text-[13px] ${
                i.done ? "text-text-4 line-through" : "text-text-1"
              }`}
            >
              {i.title}
            </span>
            <button
              onClick={() => userId && deleteChecklist(userId, i.id)}
              className="text-text-5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[color:var(--negative)]"
              aria-label="Hapus"
            >
              ×
            </button>
          </div>
        ))}
        {todays.length === 0 && (
          <p className="py-1 text-[12px] text-text-4">Belum ada tugas.</p>
        )}
      </div>

      <input
        className="mt-2 w-full border-b border-border bg-transparent py-1.5 text-[13px] text-text-1 outline-none placeholder:text-text-4"
        placeholder="Tambah tugas…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
      />
    </WidgetShell>
  );
}
