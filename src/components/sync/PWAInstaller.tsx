"use client";

import { useEffect } from "react";

/**
 * Aggressively clean up any previously-installed service worker + caches.
 * The current build does not rely on a SW for offline (IndexedDB handles
 * data), so removing it eliminates a class of stale-shell bugs on iOS Safari.
 *
 * If/when we want a real PWA SW back, re-register here.
 */
export function PWAInstaller() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .catch(() => undefined);
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined);
    }
  }, []);
  return null;
}
