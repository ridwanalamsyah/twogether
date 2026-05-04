"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Accent = "default" | "blue" | "purple" | "green" | "orange" | "pink";

interface ThemeState {
  mode: ThemeMode;
  accent: Accent;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  /** Resolves "system" to "light" | "dark" using prefers-color-scheme. */
  resolved: () => "light" | "dark";
}

export const ACCENT_OPTIONS: { id: Accent; label: string; swatch: string }[] = [
  { id: "default", label: "Mono", swatch: "#0d0d0d" },
  { id: "blue", label: "Biru", swatch: "#2563eb" },
  { id: "purple", label: "Ungu", swatch: "#7c3aed" },
  { id: "green", label: "Hijau", swatch: "#16a34a" },
  { id: "orange", label: "Oranye", swatch: "#ea580c" },
  { id: "pink", label: "Pink", swatch: "#db2777" },
];

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      accent: "default",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      resolved: () => {
        const { mode } = get();
        if (mode !== "system") return mode;
        if (typeof window === "undefined") return "light";
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      },
    }),
    {
      name: "bareng:theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
