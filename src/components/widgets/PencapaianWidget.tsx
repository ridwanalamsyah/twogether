"use client";

import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { useItems } from "@/stores/data";
import { BADGES } from "@/services/achievements";
import { WidgetShell } from "./WidgetShell";

/**
 * Compact widget showing total badges unlocked & last unlock title.
 */
export function PencapaianWidget() {
  const userId = useAuth((s) => s.userId);
  const unlocked = useItems(userId, "badge-unlocked") ?? [];
  const total = BADGES.length;
  const count = unlocked.length;

  const last = unlocked.length
    ? [...unlocked].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0]
    : null;
  const lastBadge = last
    ? BADGES.find((b) => b.id === last.title)
    : null;

  return (
    <WidgetShell
      title="Pencapaian"
      action={
        <Link href="/pencapaian" className="text-[11px] text-text-3">
          Lihat
        </Link>
      }
    >
      <div className="flex items-baseline gap-1.5">
        <div className="font-mono text-[28px] font-semibold leading-none tracking-tight text-text-1 tabular-nums">
          {count}
        </div>
        <div className="text-[12px] text-text-3">/ {total} badge</div>
      </div>
      {lastBadge ? (
        <p className="mt-2 truncate text-[11px] text-text-2">
          Terakhir: {lastBadge.title}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-text-3">
          Mulai catat aktivitas untuk unlock badge.
        </p>
      )}
    </WidgetShell>
  );
}
