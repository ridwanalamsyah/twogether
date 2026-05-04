"use client";

import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { useMoments } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatDateShort } from "@/lib/utils";

export function MomentsWidget() {
  const userId = useAuth((s) => s.userId);
  const moments = useMoments(userId);
  const recent = (moments ?? []).slice(0, 3);

  return (
    <WidgetShell
      title="Moments"
      action={
        <Link
          href="/moments"
          className="text-[11px] text-text-3 hover:text-text-1"
        >
          Semua
        </Link>
      }
    >
      {recent.length === 0 ? (
        <p className="text-[12px] text-text-4">Belum ada moment.</p>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((m) => (
            <li key={m.id} className="py-2">
              <div className="flex items-center gap-2">
                {m.emoji && <span className="text-[13px]">{m.emoji}</span>}
                <span className="truncate text-[13px] text-text-1">
                  {m.title}
                </span>
                {m.encrypted ? (
                  <span className="ml-auto text-[10px] text-text-4">terkunci</span>
                ) : null}
              </div>
              <div className="mt-0.5 text-[10px] text-text-4">
                {formatDateShort(m.date)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
