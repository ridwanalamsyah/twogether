"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ReminderType } from "@/lib/reminders";

/** Which reminders this phone wants (per device, like notification settings). */
interface ReminderPrefs {
  enabled: Record<ReminderType, boolean>;
  /** Reminder ids hidden from Beranda today. */
  dismissed: { date: string; ids: string[] };
  toggle: (t: ReminderType) => void;
  dismiss: (id: string, today: string) => void;
}

export const useReminderPrefs = create<ReminderPrefs>()(
  persist(
    (set) => ({
      enabled: { tagihan: true, anniv: true, catat: true, tilawah: true, tantangan: true },
      dismissed: { date: "", ids: [] },
      toggle: (t) => set((s) => ({ enabled: { ...s.enabled, [t]: !s.enabled[t] } })),
      dismiss: (id, today) =>
        set((s) => ({ dismissed: { date: today, ids: s.dismissed.date === today ? [...s.dismissed.ids, id] : [id] } })),
    }),
    { name: "twogether:reminders", storage: createJSONStorage(() => localStorage) },
  ),
);
