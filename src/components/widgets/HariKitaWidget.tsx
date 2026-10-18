"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useItems } from "@/stores/data";
import { celebrationToday, relationshipStart, yearsMonths } from "@/lib/anniv";
import { konfetti } from "@/lib/konfetti";
import { fromIsoDay, isoDay } from "@/lib/dates";
import { accentEmoji, useTheme } from "@/stores/theme";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import { hapticTap } from "@/lib/haptic";

/**
 * Big "Bersama X hari Y jam" countup widget. Reads first anniversary item
 * from `items` (kind=anniv). Auto-ticks every minute.
 */
export function HariKitaWidget() {
  const userId = useAuth((s) => s.userId);
  const annivs = useItems(userId, "anniv") ?? [];
  const accent = useTheme((s) => s.accent);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const anchorDate = relationshipStart(annivs);
  const celebration = celebrationToday(anchorDate);

  // A little confetti the first time Beranda opens on the big day.
  useEffect(() => {
    if (!celebration) return;
    const key = `twogether:celebrated:${isoDay()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => konfetti({ count: 60 }), 700);
    return () => clearTimeout(t);
  }, [celebration]);

  if (!anchorDate) {
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

  const start = fromIsoDay(anchorDate.slice(0, 10)).getTime();
  const diff = Math.max(0, Date.now() - start);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const ym = yearsMonths(anchorDate);

  // Suppress unused tick warning
  void tick;

  // Next round number worth celebrating (every 100 days).
  const nextMilestone = Math.ceil((days + 1) / 100) * 100;
  const toMilestone = nextMilestone - days;

  const prevMilestone = nextMilestone - 100;
  const progress = (days - prevMilestone) / 100;

  // Text and chips follow --accent-fg: with the dark "mono" accent the card
  // is cream, and hard-coded white text vanished into it.
  const fgMix = (pct: number) =>
    `color-mix(in srgb, var(--accent-fg) ${pct}%, transparent)`;

  return (
    <div className="relative">
      <Link
        href="/kita"
        className="pressable relative block overflow-hidden rounded-[24px] p-5 shadow-float"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <div className="text-[13px] font-semibold opacity-85">
          {celebration?.kind === "anniv"
            ? `Selamat hari jadi yang ke-${celebration.years}!`
            : celebration?.kind === "milestone"
              ? "Hari ini angka bulat!"
              : "Sudah bersama"}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <CountUp
            value={days}
            duration={1.2}
            className="font-mono text-[44px] font-extrabold leading-none tracking-tight"
          />
          <span className="text-[16px] font-semibold opacity-85">hari</span>
        </div>
        <div className="mt-1 text-[12px] opacity-75">
          {ym.years} tahun {ym.months} bulan · {hours} jam {mins} menit
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ background: fgMix(22) }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent-fg)", originX: 0 }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.max(0.03, progress) }}
              transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="shrink-0 text-[12px] font-semibold opacity-85">
            {toMilestone} hari lagi menuju {nextMilestone.toLocaleString("id-ID")}
          </span>
        </div>
      </Link>
      <HeartBurst />
    </div>
  );
}

const BURST = [
  { x: -34, y: -58, r: -18, s: 0.8 },
  { x: -10, y: -78, r: -6, s: 1 },
  { x: 16, y: -66, r: 10, s: 0.9 },
  { x: 36, y: -46, r: 20, s: 0.7 },
  { x: -2, y: -40, r: 0, s: 0.6 },
];

/** Softly beating heart in the corner; a tap sends a little burst up. */
function HeartBurst() {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<number[]>([]);

  function pop(e: React.MouseEvent) {
    e.stopPropagation();
    hapticTap();
    const id = Date.now();
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 1000);
  }

  return (
    <button
      type="button"
      onClick={pop}
      aria-label="Kirim hati"
      className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full"
      style={{
        background: "color-mix(in srgb, var(--accent-fg) 14%, transparent)",
        color: "var(--accent-fg)",
      }}
    >
      <motion.span
        className="grid place-items-center"
        animate={reduce ? undefined : { scale: [1, 1.14, 1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
        whileTap={{ scale: 0.8 }}
      >
        <Heart size={20} strokeWidth={2.2} fill="currentColor" />
      </motion.span>
      <AnimatePresence>
        {bursts.map((id) =>
          BURST.map((b, i) => (
            <motion.span
              key={`${id}-${i}`}
              className="pointer-events-none absolute"
              style={{ color: "var(--accent)" }}
              initial={{ x: 0, y: 0, scale: 0.3, opacity: 1, rotate: 0 }}
              animate={{ x: b.x, y: b.y, scale: b.s, opacity: 0, rotate: b.r }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.03 }}
            >
              <Heart size={16} strokeWidth={2} fill="var(--accent-fg)" />
            </motion.span>
          )),
        )}
      </AnimatePresence>
    </button>
  );
}
