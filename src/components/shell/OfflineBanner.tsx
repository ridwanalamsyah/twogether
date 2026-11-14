"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { hasRemoteSync } from "@/lib/supabase";
import { sync, type SyncSnapshot } from "@/services/sync";

const HAS_REMOTE = hasRemoteSync();

/**
 * Inline status banner rendered inside AppHeader when offline so it never
 * collides with header actions or page content.
 */
export function OfflineBanner() {
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());
  const reduce = useReducedMotion();

  useEffect(() => sync.subscribe(setSnap), []);

  if (!HAS_REMOTE) return null;

  return (
    <AnimatePresence initial={false}>
      {snap.connection !== "online" && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0.08 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--warning)]/25 bg-warning-bg px-3 py-1.5 text-[12px] text-[color:var(--warning)]">
            <WifiOff size={14} strokeWidth={2.2} className="shrink-0" aria-hidden />
            <span className="truncate font-medium leading-snug">
              Offline, catatan tetap tersimpan
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
