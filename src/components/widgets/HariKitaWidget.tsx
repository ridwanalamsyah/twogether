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

  // Prefer the relationship start ("jadian", anniversary, nikah). Birthdays
  // are also stored as anniv items — counting "together since" from a
  // partner's birth date produced nonsense like 9.907 hari.
  const anchor = (() => {
    const withDate = annivs.filter((a) => !!a.date);
    if (!withDate.length) return null;
    const isBirthday = (t: string) => /ultah|ulang tahun|birthday|lahir/i.test(t);
    const isRelationship = (t: string) =>
      /jadian|anniv|pacaran|nikah|menikah|bersama|kenal/i.test(t);
    const rel = withDate.filter((a) => isRelationship(a.title ?? ""));
    const nonBirthday = withDate.filter((a) => !isBirthday(a.title ?? ""));
    const pool = rel.length ? rel : nonBirthday.length ? nonBirthday : withDate;
    return pool.reduce((earliest, cur) =>
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

  // Next round number worth celebrating (every 100 days).
  const nextMilestone = Math.ceil((days + 1) / 100) * 100;
  const toMilestone = nextMilestone - days;

  return (
    <Link
      href="/kita"
      className="pressable relative block overflow-hidden rounded-[24px] p-5 text-white shadow-float"
      style={{
        background:
          "radial-gradient(120% 140% at 100% 0%, var(--accent-2) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 70%, #5b1f3a) 100%)",
      }}
    >
      <span aria-hidden className="float-heart absolute right-6 top-4 text-[22px] opacity-90">
        💗
      </span>
      <span aria-hidden className="float-heart-slow absolute right-16 top-12 text-[13px] opacity-70">
        💗
      </span>
      <div className="text-[13px] font-semibold text-white/85">Sudah bersama</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-[44px] font-extrabold leading-none tracking-tight">
          {days.toLocaleString("id-ID")}
        </span>
        <span className="text-[16px] font-semibold text-white/85">hari</span>
      </div>
      <div className="mt-1 text-[12px] text-white/75">
        {Math.floor(yrs)} tahun {Math.floor((yrs % 1) * 12)} bulan · {hours} jam {mins} menit
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold backdrop-blur">
        🎉 {toMilestone} hari lagi menuju {nextMilestone.toLocaleString("id-ID")}
      </div>
    </Link>
  );
}
