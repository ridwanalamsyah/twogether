"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useItems } from "@/stores/data";
import { celebrationToday, relationshipStart, yearsMonths } from "@/lib/anniv";
import { konfetti } from "@/lib/konfetti";
import { fromIsoDay, isoDay } from "@/lib/dates";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Heart } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import { hapticTap } from "@/lib/haptic";

/**
 * Big "Bersama X hari Y jam" countup widget. Reads first anniversary item
 * from `items` (kind=anniv). Auto-ticks every minute.
 */
export function HariKitaWidget() {
  const userId = useAuth((s) => s.userId);
  const annivsRaw = useItems(userId, "anniv");
  const annivs = annivsRaw ?? [];
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [milestoneView, setMilestoneView] = useState<0 | 1 | 2>(0);

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

  if (annivsRaw === undefined) {
    return (
      <div
        className="skeleton h-[176px] w-full rounded-[26px]"
        role="status"
        aria-label="Memuat hari bersama"
      />
    );
  }

  if (!anchorDate) {
    return (
      <Link
        href="/kita"
        className="pressable relative block overflow-hidden rounded-[26px] p-5 shadow-float transition-transform duration-200 active:scale-[0.98]"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold opacity-90">Hari kita</div>
            <div className="mt-1 text-[22px] font-bold leading-tight tracking-tight">
              Tandai tanggal jadian
            </div>
            <p className="mt-1 text-[13px] opacity-85">
              Hitung hari bersama dan rayakan tiap fase berdua.
            </p>
          </div>
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{
              background: "color-mix(in srgb, var(--accent-fg) 16%, transparent)",
              color: "var(--accent-fg)",
            }}
          >
            <Heart size={20} strokeWidth={2.2} aria-hidden />
          </span>
        </div>
        <span
          className="mt-4 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
          style={{ background: "var(--accent-fg)", color: "var(--accent)" }}
        >
          Atur sekarang <ChevronRight size={14} strokeWidth={2.4} aria-hidden />
        </span>
      </Link>
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

  const fgMix = (pct: number) =>
    `color-mix(in srgb, var(--accent-fg) ${pct}%, transparent)`;

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[26px] p-5 shadow-float"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <Link
          href="/kita"
          className="block pr-12 transition-opacity active:opacity-85"
        >
          <div className="text-[13px] font-semibold tracking-tight opacity-90">
            {celebration?.kind === "anniv"
              ? `Selamat hari jadi yang ke-${celebration.years}!`
              : celebration?.kind === "milestone"
                ? "Hari ini angka bulat!"
                : "Sudah bersama"}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <CountUp
              value={days}
              duration={1.1}
              className="tabular-nums text-[48px] font-bold leading-none tracking-tight"
            />
            <span className="text-[17px] font-semibold opacity-90">hari</span>
          </div>
          <div className="mt-1 text-[12px] tracking-tight opacity-85">
            {ym.years} tahun {ym.months} bulan · {hours} jam {mins} menit
          </div>
        </Link>

        <button
          type="button"
          onClick={() => {
            hapticTap();
            setMilestoneView((v) => ((v + 1) % 3) as 0 | 1 | 2);
          }}
          aria-label="Ubah ringkasan milestone"
          className="mt-4 flex w-full items-center gap-3 rounded-xl py-1 text-left transition-opacity active:opacity-75"
        >
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ background: fgMix(25) }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent-fg)", originX: 0 }}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: Math.max(0.04, progress) }}
              transition={reduce ? { duration: 0.1 } : { duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.span
              key={milestoneView}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 tabular-nums text-[12px] font-semibold tracking-tight opacity-90"
            >
              {milestoneView === 0 && `${toMilestone} hari lagi ke ${nextMilestone.toLocaleString("id-ID")}`}
              {milestoneView === 1 && `${Math.round(progress * 100)}% perjalanan fase ini`}
              {milestoneView === 2 && `Total ${Math.floor(days / 7)} minggu bersama`}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <HeartBurst />
    </div>
  );
}

const BURST = [
  { x: -38, y: -65, r: -24, s: 0.9 },
  { x: -14, y: -88, r: -8, s: 1.1 },
  { x: 18, y: -72, r: 12, s: 1 },
  { x: 42, y: -52, r: 24, s: 0.8 },
  { x: -2, y: -48, r: 0, s: 0.7 },
  { x: 26, y: -95, r: 18, s: 0.85 },
];

/** Calm heart trigger in the corner; a tap sends an interactive heart burst up. */
function HeartBurst() {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<number[]>([]);

  function pop(e: React.MouseEvent) {
    e.stopPropagation();
    hapticTap();
    if (reduce) return;
    const id = Date.now();
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 1000);
  }

  return (
    <motion.button
      type="button"
      onClick={pop}
      whileHover={reduce ? undefined : { scale: 1.08 }}
      whileTap={reduce ? undefined : { scale: 0.82 }}
      aria-label="Kirim hati"
      className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full"
      style={{
        background: "color-mix(in srgb, var(--accent-fg) 14%, transparent)",
        color: "var(--accent-fg)",
      }}
    >
      <motion.span
        className="grid place-items-center"
        initial={reduce ? false : { scale: 0.85 }}
        animate={reduce ? undefined : { scale: [0.85, 1.14, 1] }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Heart size={20} strokeWidth={2.2} fill="currentColor" aria-hidden />
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
              <Heart size={16} strokeWidth={2} fill="var(--accent-fg)" aria-hidden />
            </motion.span>
          )),
        )}
      </AnimatePresence>
    </motion.button>
  );
}
