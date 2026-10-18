"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Per-phone privacy switches (not synced: your partner decides for theirs).
 *  - hideMoney: amounts show as "Rp •••" until tapped back on, for checking
 *    the app with someone looking over your shoulder.
 *  - discreetNotifications: notifications say "Ada kabar baru" instead of
 *    the message itself.
 */
interface PrivacyState {
  hideMoney: boolean;
  discreetNotifications: boolean;
  /** Opt-in anonymous crash reports (services/errorReports.ts). */
  errorReports: boolean;
  setErrorReports: (v: boolean) => void;
  setHideMoney: (v: boolean) => void;
  setDiscreetNotifications: (v: boolean) => void;
}

export const usePrivacy = create<PrivacyState>()(
  persist(
    (set) => ({
      hideMoney: false,
      discreetNotifications: false,
      errorReports: false,
      setErrorReports: (errorReports) => set({ errorReports }),
      setHideMoney: (hideMoney) => set({ hideMoney }),
      setDiscreetNotifications: (discreetNotifications) => {
        set({ discreetNotifications });
        void shareWithServiceWorker(discreetNotifications);
      },
    }),
    { name: "twogether:privacy", storage: createJSONStorage(() => localStorage) },
  ),
);

// Push notifications are drawn by the service worker, which can't read
// localStorage; it checks this cache entry instead (see public/sw.js).
// Not "twogether-…": the service worker deletes those caches on every update.
export const DISCREET_CACHE = "prefs-v1";
export const DISCREET_KEY = "/__prefs/discreet";

async function shareWithServiceWorker(on: boolean) {
  try {
    const cache = await caches.open(DISCREET_CACHE);
    await cache.put(DISCREET_KEY, new Response(on ? "1" : "0"));
  } catch {
    /* no Cache API (old browser / native app): in-app notifications still obey */
  }
}

/** Title and body for a notification, hidden behind a generic line if asked. */
export function notificationText(title: string, body = ""): { title: string; body: string } {
  return usePrivacy.getState().discreetNotifications ? { title: "Twogether", body: "Ada kabar baru" } : { title, body };
}

/** Non-React read for formatters and the notification code. */
export function privacySnapshot() {
  return usePrivacy.getState();
}
