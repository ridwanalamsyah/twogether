"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Tracks a local, device-only PIN that gates the app from being opened by
 * anyone who picks up the phone. The PIN is hashed (SHA-256) before storage;
 * we never keep the plaintext.
 *
 * Also tracks auto-dark schedule: when enabled, the active theme flips to
 * dark between darkFrom..darkTo hours (HH format, 0–23).
 */

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface SecurityState {
  pinHash: string | null;
  locked: boolean;
  autoDark: boolean;
  darkFrom: number;
  darkTo: number;
  lastUnlockAt: number | null;
  /** Spaces (hrefs) that need PIN/biometric to open. */
  lockedSpaces: string[];
  /** WebAuthn credential id for Face ID / sidik jari unlock. */
  bioCredId: string | null;
  /** Session-only: when locked spaces were last unlocked. */
  spacesUnlockedAt: number | null;
  toggleSpaceLock: (href: string) => void;
  setBioCredId: (id: string | null) => void;
  unlockSpaces: () => void;
  relockSpaces: () => void;
  /** Unlock without PIN (after a successful biometric check). */
  unlockWithBiometric: () => void;

  setPin: (pin: string) => Promise<void>;
  clearPin: () => void;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  setAutoDark: (enabled: boolean, from?: number, to?: number) => void;
}

export const useSecurity = create<SecurityState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      locked: false,
      autoDark: false,
      darkFrom: 18,
      darkTo: 6,
      lastUnlockAt: null,
      lockedSpaces: [],
      bioCredId: null,
      spacesUnlockedAt: null,

      toggleSpaceLock: (href) =>
        set((s) => ({
          lockedSpaces: s.lockedSpaces.includes(href)
            ? s.lockedSpaces.filter((h) => h !== href)
            : [...s.lockedSpaces, href],
        })),
      setBioCredId: (id) => set({ bioCredId: id }),
      unlockSpaces: () => set({ spacesUnlockedAt: Date.now() }),
      relockSpaces: () => set({ spacesUnlockedAt: null }),
      unlockWithBiometric: () => set({ locked: false, lastUnlockAt: Date.now(), spacesUnlockedAt: Date.now() }),

      setPin: async (pin) => {
        const hash = await sha256(pin);
        set({ pinHash: hash, locked: false, lastUnlockAt: Date.now() });
      },
      clearPin: () => set({ pinHash: null, locked: false, lockedSpaces: [], bioCredId: null }),
      unlock: async (pin) => {
        const hash = await sha256(pin);
        if (hash === get().pinHash) {
          set({ locked: false, lastUnlockAt: Date.now(), spacesUnlockedAt: Date.now() });
          return true;
        }
        return false;
      },
      lock: () => {
        if (get().pinHash) set({ locked: true });
      },
      setAutoDark: (enabled, from, to) =>
        set({
          autoDark: enabled,
          darkFrom: from ?? get().darkFrom,
          darkTo: to ?? get().darkTo,
        }),
    }),
    {
      name: "bareng:security",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        pinHash: s.pinHash,
        lockedSpaces: s.lockedSpaces,
        bioCredId: s.bioCredId,
        autoDark: s.autoDark,
        darkFrom: s.darkFrom,
        darkTo: s.darkTo,
      }),
      onRehydrateStorage: () => (state) => {
        // When hydrating with a PIN set, start locked so reopening the app
        // requires unlock. Skip on very recent unlocks to avoid re-prompting
        // during navigation within the same session.
        if (state?.pinHash) {
          state.locked = true;
        }
      },
    },
  ),
);

/** Returns true if "now" falls inside [from..to] handling wrap-around. */
export function isInDarkHours(from: number, to: number, date = new Date()): boolean {
  const h = date.getHours();
  if (from === to) return false;
  if (from < to) return h >= from && h < to;
  return h >= from || h < to;
}
