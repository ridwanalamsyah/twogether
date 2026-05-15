"use client";

import { useEffect, useState } from "react";
import { sync, type SyncSnapshot } from "@/services/sync";

/**
 * Slim banner shown when the device goes offline. Auto-hides on reconnect.
 * Sticks below the app header so it never blocks tappable controls.
 */
export function OfflineBanner() {
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());

  useEffect(() => sync.subscribe(setSnap), []);

  if (snap.connection === "online") return null;

  return (
    <div className="sticky top-[calc(var(--header-top-pad)+48px)] z-30 mx-4 mt-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      <span className="flex-1 font-medium">
        Mode offline — perubahan akan tersinkron setelah online
      </span>
      {snap.pending > 0 && (
        <span className="font-mono text-[10px] opacity-70">
          {snap.pending} antri
        </span>
      )}
    </div>
  );
}
