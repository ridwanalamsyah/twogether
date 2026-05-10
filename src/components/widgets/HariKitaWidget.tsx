"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useItems } from "@/stores/data";

/**
 * Big "Bersama X hari Y jam" countup widget. Reads first anniversary item
 * from `items` (kind=anniv). Auto-ticks every minute.
 */
export function HariKitaWidget() {
  const userId = useAuth((s) => s.userId);
  const annivs = useItems(userId, "anniv") ?? [];
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // pick the earliest anniv with a date
  const anchor = (() => {
    const withDate = annivs.filter((a) => !!a.date);
    if (!withDate.length) return null;
    return withDate.reduce((earliest, cur) =>
      !earliest || (cur.date! < earliest.date!) ? cur : earliest,
    );
  })();

  if (!anchor || !anchor.date) {
    return (
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-[11px] font-medium text-text-3">Hari kita</div>
          <div className="mt-0.5 text-[13px] font-semibold text-text-1">
            Tambah anniversary
          </div>
          <div className="mt-0.5 text-[11px] text-text-3">
            Lacak berapa lama bersama
          </div>
        </div>
        <Link
          href="/kita"
          className="rounded-md bg-text-1 px-3 py-1.5 text-[11px] font-semibold text-bg-app"
        >
          Atur
        </Link>
      </div>
    );
  }

  const start = new Date(anchor.date).getTime();
  const diff = Math.max(0, Date.now() - start);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const yrs = days / 365.25;

  // Suppress unused tick warning
  void tick;

  return (
    <Link
      href="/kita"
      className="surface flex flex-col items-center gap-1 p-4 active:scale-[0.99]"
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-3">
        Bersama {anchor.title}
      </div>
      <div className="font-mono text-[28px] font-bold leading-tight text-text-1">
        {days.toLocaleString("id-ID")}
        <span className="ml-1 text-[14px] font-medium text-text-3">hari</span>
      </div>
      <div className="text-[12px] text-text-2">
        {hours}j {mins}m · {yrs.toFixed(2)} tahun
      </div>
    </Link>
  );
}
