"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** "Bagikan lokasi" state for this device. */
interface LocationShareState {
  /** Sharing stays on until this time (ms). null = off. */
  until: number | null;
  start: (minutes: number) => void;
  stop: () => void;
}

export const useLocationShare = create<LocationShareState>()(
  persist(
    (set) => ({
      until: null,
      start: (minutes) => set({ until: Date.now() + minutes * 60_000 }),
      stop: () => set({ until: null }),
    }),
    { name: "twogether:share-location", storage: createJSONStorage(() => localStorage) },
  ),
);

export interface LivePayload {
  lat: number;
  lng: number;
  acc: number;
  at: number;
  until: number;
}
