"use client";

import { useEffect, useState } from "react";
import { sync, type SyncSnapshot } from "@/services/sync";
import { cn } from "@/lib/utils";

/**
 * Minimalist sync status — small dot only. Tooltip on hover for details.
 */
export function SyncIndicator({ className }: { className?: string }) {
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());

  useEffect(() => sync.subscribe(setSnap), []);

  const { connection, pending, syncing, failed } = snap;
  const offline = connection === "offline";
  const dirty = pending > 0 || failed > 0;

  const title = offline
    ? "Offline"
    : syncing
      ? "Mensinkron…"
      : dirty
        ? `${pending} belum sinkron${failed > 0 ? ` · ${failed} gagal` : ""}`
        : "Tersinkron";

  const dotColor = offline
    ? "bg-[color:var(--warning)]"
    : dirty
      ? "bg-[color:var(--info)] animate-pulse"
      : "bg-[color:var(--positive)]";

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-9 w-3 items-center justify-center",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
    </span>
  );
}
