"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/stores/auth";
import {
  ensureDefaultSkripsiChapters,
  useSkripsiChapters,
  useSkripsiBimbingan,
  useSkripsiMeta,
} from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { formatDateShort } from "@/lib/utils";

export function SkripsiWidget() {
  const userId = useAuth((s) => s.userId);
  const chapters = useSkripsiChapters(userId);
  const bimbingan = useSkripsiBimbingan(userId);
  const meta = useSkripsiMeta(userId);

  useEffect(() => {
    if (!userId) return;
    void ensureDefaultSkripsiChapters(userId);
  }, [userId]);

  const overall = useMemo(() => {
    const cs = chapters ?? [];
    if (cs.length === 0) return 0;
    const sum = cs.reduce((a, c) => a + (c.progress || 0), 0);
    return Math.round(sum / cs.length);
  }, [chapters]);

  const nextBimbingan = useMemo(() => {
    const bs = bimbingan ?? [];
    return bs.find((b) => !b.done) ?? bs[0];
  }, [bimbingan]);

  return (
    <WidgetShell
      title="Skripsi"
      action={
        <Link href="/skripsi" className="text-[11px] text-text-3 hover:text-text-1">
          Detail
        </Link>
      }
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[20px] font-semibold tracking-tight text-text-1">
          {overall}%
        </span>
        {meta?.judul && (
          <span className="ml-2 truncate text-[11px] text-text-3">{meta.judul}</span>
        )}
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${overall}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1">
        {(chapters ?? []).slice(0, 3).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-[12px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] text-text-4">BAB {c.number}</span>
              <span className="truncate text-text-2">{c.title}</span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-text-3">
              {c.progress}%
            </span>
          </li>
        ))}
      </ul>

      {nextBimbingan && (
        <div className="mt-3 border-t border-border pt-2 text-[11px]">
          <span className="text-text-3">{formatDateShort(nextBimbingan.date)}</span>
          <span className="ml-1.5 text-text-1">{nextBimbingan.topic || "Bimbingan"}</span>
        </div>
      )}
    </WidgetShell>
  );
}
