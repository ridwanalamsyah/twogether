"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail, Pin, X } from "lucide-react";
import { useNick } from "@/lib/nick";
import { useState } from "react";
import { useAuth } from "@/stores/auth";
import { useItems, upsertItem, deleteItem } from "@/stores/data";
import { hapticTap } from "@/lib/haptic";

/**
 * A single pinned message visible at the top of home. Useful for partner
 * to leave a short note. Stored as items.kind=pin.
 */
export function PinnedMessageWidget() {
  const { nick } = useNick();
  const userId = useAuth((s) => s.userId);
  const name = useAuth((s) => s.name);
  const reduce = useReducedMotion();
  const pins = useItems(userId, "pin") ?? [];
  const pin = pins[pins.length - 1] ?? null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  async function save() {
    if (!userId || !draft.trim()) return;
    hapticTap();
    if (pin) {
      await upsertItem(userId, {
        id: pin.id,
        kind: "pin",
        title: draft.trim(),
        who: name ?? undefined,
      });
    } else {
      await upsertItem(userId, {
        kind: "pin",
        title: draft.trim(),
        who: name ?? undefined,
      });
    }
    setDraft("");
    setEditing(false);
  }

  async function clearPin() {
    if (!userId || !pin) return;
    hapticTap();
    await deleteItem(userId, pin.id);
  }

  const stateKey = editing ? "edit" : pin ? `pin-${pin.id}` : "empty";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!pin && !editing ? (
        <motion.button
          key={stateKey}
          type="button"
          onClick={() => setEditing(true)}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className="surface pressable flex min-h-[48px] w-full items-center gap-2.5 p-3.5 text-left"
        >
          <Mail size={18} strokeWidth={2} className="shrink-0 text-text-3" aria-hidden />
          <span className="text-[13px] text-text-3">
            Tulis catatan singkat…
          </span>
        </motion.button>
      ) : editing ? (
        <motion.div
          key={stateKey}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className="surface flex items-center gap-1.5 p-2.5"
        >
          <Mail size={18} strokeWidth={2} className="ml-1 shrink-0 text-text-3" aria-hidden />
          <label htmlFor="pinned-msg-input" className="sr-only">
            Pesan untuk pasangan
          </label>
          <input
            id="pinned-msg-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            placeholder="Mis. Pulang jam 7 ya"
            className="input-base min-w-0 flex-1 text-[13px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim()}
            className="min-h-[44px] shrink-0 whitespace-nowrap rounded-full bg-accent px-3.5 text-[12px] font-semibold text-accent-fg disabled:opacity-50"
          >
            Simpan
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-[44px] shrink-0 whitespace-nowrap px-2 text-[12px] font-medium text-text-3 hover:text-text-1"
          >
            Batal
          </button>
        </motion.div>
      ) : (
        <motion.div
          key={stateKey}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className="note-card flex items-center gap-2.5 py-2.5 pl-3.5 pr-2"
        >
          <Pin size={16} strokeWidth={2} className="shrink-0 opacity-75" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-text-1">
              {pin!.title}
            </div>
            {pin!.who && (
              <div className="text-[12px] text-text-3">Dari {nick(pin!.who)}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft(pin!.title);
              setEditing(true);
            }}
            className="min-h-[44px] px-2 text-[12px] font-medium text-text-3 active:opacity-60"
          >
            Ubah
          </button>
          <button
            type="button"
            aria-label="Hapus pesan"
            onClick={clearPin}
            className="grid h-11 w-11 -mr-1 place-items-center rounded-full text-text-3 active:opacity-60"
          >
            <X size={16} strokeWidth={2.2} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
