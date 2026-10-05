"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Accent =
  | "default"
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "pink"
  | "mono"
  | "ramadhan"
  | "valentine"
  | "senja"
  | "laut"
  | "matcha"
  | "lavender";

export type AppIconId = "rose" | "senja" | "malam" | "ramadhan" | "laut" | "krem";

export const APP_ICONS: { id: AppIconId; label: string }[] = [
  { id: "rose", label: "Rose" },
  { id: "senja", label: "Senja" },
  { id: "malam", label: "Malam" },
  { id: "ramadhan", label: "Ramadhan" },
  { id: "laut", label: "Laut" },
  { id: "krem", label: "Krem" },
];

interface ThemeState {
  mode: ThemeMode;
  accent: Accent;
  icon: AppIconId;
  setIcon: (icon: AppIconId) => void;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  /** Resolves "system" to "light" | "dark" using prefers-color-scheme. */
  resolved: () => "light" | "dark";
}

export interface AccentOption {
  id: Accent;
  label: string;
  swatch: string;
  /** Second gradient stop. */
  swatch2: string;
  /** Seasonal "skin": also tints the background & decorations. */
  seasonal?: { emoji: string; note: string };
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "default", label: "Rose", swatch: "#f0566a", swatch2: "#ff8a5c" },
  { id: "pink", label: "Pink", swatch: "#db2777", swatch2: "#ff7eb6" },
  { id: "purple", label: "Ungu", swatch: "#7c3aed", swatch2: "#b26bff" },
  { id: "blue", label: "Biru", swatch: "#2563eb", swatch2: "#5b8cff" },
  { id: "green", label: "Hijau", swatch: "#16a34a", swatch2: "#4cc38a" },
  { id: "orange", label: "Oranye", swatch: "#ea580c", swatch2: "#ffa94d" },
  { id: "mono", label: "Hitam", swatch: "#2a1f1a", swatch2: "#5a4840" },
];

export const SEASONAL_OPTIONS: AccentOption[] = [
  { id: "ramadhan", label: "Ramadhan", swatch: "#0f8a5f", swatch2: "#d9b24c", seasonal: { emoji: "🌙", note: "Hijau & emas" } },
  { id: "valentine", label: "Valentine", swatch: "#e11d48", swatch2: "#fb7185", seasonal: { emoji: "💘", note: "Merah muda manis" } },
  { id: "senja", label: "Senja", swatch: "#f97316", swatch2: "#a855f7", seasonal: { emoji: "🌇", note: "Oranye ke ungu" } },
  { id: "laut", label: "Laut", swatch: "#0ea5e9", swatch2: "#14b8a6", seasonal: { emoji: "🌊", note: "Biru & tosca" } },
  { id: "matcha", label: "Matcha", swatch: "#65a30d", swatch2: "#a3c25a", seasonal: { emoji: "🍵", note: "Hijau lembut" } },
  { id: "lavender", label: "Lavender", swatch: "#8b5cf6", swatch2: "#c4b5fd", seasonal: { emoji: "💜", note: "Ungu kalem" } },
];

/** Decoration used on the "Sudah bersama" card. */
export function accentEmoji(accent: Accent): string {
  return SEASONAL_OPTIONS.find((o) => o.id === accent)?.seasonal?.emoji ?? "💗";
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      accent: "default",
      icon: "rose",
      setIcon: (icon) => set({ icon }),
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
