"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { sync, type SyncSnapshot } from "@/services/sync";

/**
 * Inline status banner rendered inside AppHeader when offline so it never
 * collides with header actions or page content.
 */
export function OfflineBanner() {
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());
  const reduce = useReducedMotion();

  useEffect(() => sync.subscribe(setSnap), []);

  return (
    <AnimatePresence initial={false}>
      {snap.connection !== "online" && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto", marginTop: 8 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--warning)]/25 bg-warning-bg px-3 py-1.5 text-[12px] text-[color:var(--warning)]">
            <WifiOff size={14} strokeWidth={2.2} className="shrink-0" aria-hidden />
            <span className="flex-1 font-medium leading-snug">
              Offline. Catatanmu aman di HP dan otomatis sinkron nanti.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
