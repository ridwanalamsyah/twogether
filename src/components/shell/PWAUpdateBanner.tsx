"use client";

import { useEffect, useState } from "react";

/**
 * Listens to service-worker updates. When a new SW takes control, show a
 * subtle banner with a "Reload" button so users always run the latest UI.
 */
export function PWAUpdateBanner() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    function onUpdate(reg: ServiceWorkerRegistration) {
      const sw = reg.installing ?? reg.waiting;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          setAvailable(true);
        }
      });
    }

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      registration = reg;
      if (reg.waiting) setAvailable(true);
      reg.addEventListener("updatefound", () => onUpdate(reg));
    });

    const onControllerChange = () => {
      // Reload once new SW takes over, when user tapped reload.
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      void registration;
    };
  }, []);

  function reload() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    });
  }

  if (!available) return null;

  return (
    <div className="fixed bottom-[calc(72px+var(--sab))] left-3 right-3 z-40 flex items-center gap-2 rounded-lg border border-border bg-bg-elev2 px-3 py-2 shadow-lg">
      <span className="text-base">✨</span>
      <div className="flex-1">
        <div className="text-[12px] font-semibold text-text-1">
          Versi baru tersedia
        </div>
        <div className="text-[10px] text-text-3">
          Tap reload untuk dapat fitur terbaru
        </div>
      </div>
      <button
        onClick={reload}
        className="rounded-md bg-text-1 px-3 py-1.5 text-[11px] font-semibold text-bg-app active:scale-95"
      >
        Reload
      </button>
    </div>
  );
}
