"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CITIES } from "@/data/cities";

/** Per-device location for prayer times (city or GPS). */
interface ShalatPrefs {
  label: string;
  lat: number;
  lng: number;
  source: "city" | "gps";
  setPlace: (p: { label: string; lat: number; lng: number; source: "city" | "gps" }) => void;
}

export const useShalatPrefs = create<ShalatPrefs>()(
  persist(
    (set) => ({
      label: CITIES[0].name,
      lat: CITIES[0].lat,
      lng: CITIES[0].lng,
      source: "city",
      setPlace: (p) => set(p),
    }),
    { name: "twogether:shalat", storage: createJSONStorage(() => localStorage) },
  ),
);
