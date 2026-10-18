"use client";

import { Mail, Pin } from "lucide-react";
import { useNick } from "@/lib/nick";
import { useState } from "react";
import { useAuth } from "@/stores/auth";
import { useItems, upsertItem, deleteItem } from "@/stores/data";
import { hapticTap } from "@/lib/haptic";

/**
 * A single pinned message visible at the top of home — useful for partner
 * to leave a short note ("pulang jam 7 ya 💕"). Stored as items.kind=pin.
 * The earliest item is shown; tap to edit/clear.
 */
export function PinnedMessageWidget() {
  const { nick } = useNick();
  const userId = useAuth((s) => s.userId);
  const name = useAuth((s) => s.name);
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

  if (!pin && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="surface pressable flex w-full items-center gap-2.5 p-3.5 text-left"
      >
        <Mail size={18} strokeWidth={2} className="shrink-0 text-text-3" />
        <span className="text-[13px] text-text-3">
          Tulis pesan manis untuk pasanganmu…
        </span>
      </button>
    );
  }

  if (editing) {
    return (
      <div className="surface flex items-center gap-2 p-3">
        <Mail size={18} strokeWidth={2} className="shrink-0 text-text-3" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={120}
          placeholder="Mis. Pulang jam 7 ya"
          className="input-base flex-1 text-[13px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={save}
          disabled={!draft.trim()}
          className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg disabled:opacity-50"
        >
          Simpan
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-[11px] text-text-3"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="note-card flex items-center gap-2.5 p-3.5">
      <Pin size={16} strokeWidth={2} className="shrink-0 opacity-70" />
      <div className="flex-1 truncate">
        <div className="truncate text-[13px] font-medium text-text-1">
          {pin!.title}
        </div>
        {pin!.who && (
          <div className="text-[10px] text-text-3">— {nick(pin!.who)}</div>
        )}
      </div>
      <button
        onClick={() => {
          setDraft(pin!.title);
          setEditing(true);
        }}
        className="text-[11px] text-text-3 active:opacity-60"
      >
        Ubah
      </button>
      <button aria-label="Hapus pesan" onClick={clearPin} className="text-[11px] text-text-3 active:opacity-60">
        ×
      </button>
    </div>
  );
}
