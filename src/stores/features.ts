"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CORE_FEATURES } from "@/data/features";

interface FeaturesState {
  /** hrefs of the spaces shown in Jelajah & Beranda, in display order. */
  enabled: string[];
  toggle: (href: string) => void;
  /** Move a space to a new position (drag & drop in Jelajah). */
  move: (fromHref: string, toHref: string) => void;
  isOn: (href: string) => boolean;
}

export const useFeatures = create<FeaturesState>()(
  persist(
    (set, get) => ({
      enabled: CORE_FEATURES,
      toggle: (href) =>
        set((s) => ({
          enabled: s.enabled.includes(href)
            ? s.enabled.filter((h) => h !== href)
            : [...s.enabled, href],
        })),
      move: (fromHref, toHref) =>
        set((s) => {
          const from = s.enabled.indexOf(fromHref);
          const to = s.enabled.indexOf(toHref);
          if (from === -1 || to === -1 || from === to) return s;
          const next = [...s.enabled];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          return { enabled: next };
        }),
      isOn: (href) => get().enabled.includes(href),
    }),
    {
      name: "twogether:features",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled }),
    },
  ),
);
