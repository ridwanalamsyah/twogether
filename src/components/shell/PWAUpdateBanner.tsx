"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import { IconTile } from "@/lib/icons";

let reloadRequested = false;

/**
 * Listens to service-worker updates. When a new SW takes control, show a
 * calm banner with a "Reload" button so users always run the latest UI.
 */
export function PWAUpdateBanner() {
  const [available, setAvailable] = useState(false);
  const reduce = useReducedMotion();

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
      // Only reload when the user asked for it. The very first install also
      // fires controllerchange (clients.claim) and used to reload the page
      // in the middle of logging in.
      if (!reloadRequested) return;
      reloadRequested = false;
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
    reloadRequested = true;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <AnimatePresence>
      {available && (
        <motion.div
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="fixed bottom-[calc(var(--nav-h)+12px)] left-3 right-3 z-40 mx-auto flex max-w-[456px] items-center gap-2.5 rounded-2xl border border-border bg-bg-card px-3 py-2.5 shadow-float"
        >
          <IconTile spec={{ Icon: Sparkles, tint: "var(--accent)" }} size={34} radius={10} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-text-1">
              Versi baru tersedia
            </div>
            <div className="text-[12px] text-text-3">
              Tap reload untuk pembaruan terbaru
            </div>
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg transition-transform active:scale-95"
          >
            <RefreshCw size={13} strokeWidth={2.2} />
            Reload
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
