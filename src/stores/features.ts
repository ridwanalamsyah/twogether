"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CORE_FEATURES } from "@/data/features";

interface FeaturesState {
  /** hrefs of the spaces shown in Jelajah & Beranda, in display order. */
  enabled: string[];
  toggle: (href: string) => void;
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
      isOn: (href) => get().enabled.includes(href),
    }),
    {
      name: "twogether:features",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled }),
    },
  ),
);
