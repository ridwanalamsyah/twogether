"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Per-device ibadah preferences. */
interface IbadahPrefs {
  /** Hijri correction vs Umm al-Qura: −1, 0, +1 (sidang isbat). */
  hijriOffset: number;
  setHijriOffset: (n: number) => void;
}

export const useIbadahPrefs = create<IbadahPrefs>()(
  persist(
    (set) => ({
      hijriOffset: 0,
      setHijriOffset: (n) => set({ hijriOffset: Math.max(-2, Math.min(2, n)) }),
    }),
    { name: "twogether:ibadah", storage: createJSONStorage(() => localStorage) },
  ),
);
