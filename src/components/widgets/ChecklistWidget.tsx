"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
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
  const reduce = useReducedMotion();
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
        <span className="text-[12px] font-semibold tabular-nums text-text-3">
          {done}/{todays.length}
        </span>
      }
    >
      <div className="space-y-0.5">
        <AnimatePresence initial={false}>
          {todays.map((i) => (
            <motion.div
              key={i.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="group flex min-h-[44px] items-center gap-1"
            >
              <button
                type="button"
                onClick={() => toggle(i.id, i.done)}
                aria-label={i.done ? `Tandai ${i.title} belum selesai` : `Tandai ${i.title} selesai`}
                aria-pressed={Boolean(i.done)}
                className="-ml-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                    i.done
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-strong"
                  }`}
                >
                  {i.done ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
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
                </span>
              </button>
              <span
                className={`flex-1 truncate text-[13px] ${
                  i.done ? "text-text-4 line-through" : "text-text-1"
                }`}
              >
                {i.title}
              </span>
              <button
                type="button"
                onClick={() => userId && deleteChecklist(userId, i.id)}
                className="-mr-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-4 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-[color:var(--negative)]"
                aria-label={`Hapus ${i.title}`}
              >
                <X size={15} strokeWidth={2.2} aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {todays.length === 0 && (
          <p className="py-1 text-[12px] text-text-4">Belum ada tugas.</p>
        )}
      </div>

      <label htmlFor="checklist-quick-add" className="sr-only">
        Tambah tugas
      </label>
      <input
        id="checklist-quick-add"
        className="mt-1 min-h-[44px] w-full rounded-lg border-b border-border bg-transparent px-1 py-2 text-[13px] text-text-1 placeholder:text-text-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
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
