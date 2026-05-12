"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useStableArray } from "@/lib/useStableArray";
import {
  useTransactions,
  useDeposits,
  useAllEntries,
  useMoments,
} from "@/stores/data";

const YEAR = new Date().getFullYear();

function formatRupiah(n: number): string {
  if (Math.abs(n) >= 1_000_000_000)
    return `Rp${(n / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000_000)
    return `Rp${(n / 1_000_000).toFixed(1)} jt`;
  if (Math.abs(n) >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`;
  return `Rp${n.toLocaleString("id-ID")}`;
}

export default function WrappedPage() {
  const userId = useAuth((s) => s.userId);
  const txs = useStableArray(useTransactions(userId));
  const deps = useStableArray(useDeposits(userId));
  const entries = useStableArray(useAllEntries(userId));
  const moments = useStableArray(useMoments(userId));
  const stats = useMemo(() => {
    const yearStart = new Date(YEAR, 0, 1).getTime();
    const yearEnd = new Date(YEAR + 1, 0, 1).getTime();
    const inYear = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= yearStart && t < yearEnd;
    };

    let income = 0;
    let expense = 0;
    const catTotals = new Map<string, number>();
    for (const t of txs) {
      if (!inYear(t.date)) continue;
      if (t.kind === "in") income += t.amount;
      if (t.kind === "out") {
        expense += t.amount;
        catTotals.set(t.category, (catTotals.get(t.category) ?? 0) + t.amount);
      }
    }
    const topCats = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    let saved = 0;
    for (const d of deps) {
      if (inYear(d.date)) saved += d.amount;
    }

    const dayCounts = new Map<string, number>();
    for (const e of entries) {
      if (!inYear(e.date)) continue;
      const d = e.date.slice(0, 10);
      dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
    }
    const totalActiveDays = dayCounts.size;

    let topDay: string | null = null;
    let topCount = 0;
    for (const [d, c] of dayCounts) {
      if (c > topCount) {
        topCount = c;
        topDay = d;
      }
    }

    let pomodoroMinutes = 0;
    let waterCups = 0;
    let moodSum = 0;
    let moodCount = 0;
    let exerciseSessions = 0;
    for (const e of entries) {
      if (!inYear(e.date)) continue;
      if (e.kind === "pomodoro") pomodoroMinutes += e.valueNum ?? 0;
      if (e.kind === "water") waterCups += e.valueNum ?? 0;
      if (e.kind === "mood" && e.valueNum != null) {
        moodSum += e.valueNum;
        moodCount += 1;
      }
      if (e.kind === "exercise") exerciseSessions += 1;
    }

    const momentsCount = moments.filter((m) => inYear(m.date)).length;

    return {
      income,
      expense,
      net: income - expense,
      saved,
      topCats,
      totalActiveDays,
      topDay,
      topCount,
      pomodoroHours: Math.round(pomodoroMinutes / 60),
      waterCups,
      avgMood: moodCount ? +(moodSum / moodCount).toFixed(2) : 0,
      exerciseSessions,
      momentsCount,
    };
  }, [txs, deps, entries, moments]);

  return (
    <div className="animate-in pb-24">
      <AppHeader
        title={`Wrapped ${YEAR}`}
        subtitle="Ringkasan tahunan kalian"
        actions={
          <Link href="/home" className="text-[12px] text-text-3 active:opacity-50">
            Tutup
          </Link>
        }
      />

      <div className="space-y-3 px-5 mt-3">
        <Card emoji="📅" title="Hari aktif">
          <Big>{stats.totalActiveDays}</Big>
          <Sub>hari isi tracker tahun ini</Sub>
        </Card>

        <Card emoji="🔥" title="Hari tersibuk">
          <Big>
            {stats.topDay
              ? new Date(stats.topDay).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </Big>
          <Sub>{stats.topCount} catatan dalam sehari</Sub>
        </Card>

        <Card emoji="💰" title="Keuangan">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Masuk" value={formatRupiah(stats.income)} tone="emerald" />
            <Stat label="Keluar" value={formatRupiah(stats.expense)} tone="rose" />
            <Stat label="Net" value={formatRupiah(stats.net)} tone="default" />
          </div>
          {stats.topCats.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-text-3">
                Top 3 kategori boros
              </div>
              {stats.topCats.map(([cat, amt], i) => (
                <div key={cat} className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-text-1">
                    {i + 1}. {cat}
                  </span>
                  <span className="font-mono text-text-3">
                    {formatRupiah(amt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card emoji="🎯" title="Tabungan">
          <Big>{formatRupiah(stats.saved)}</Big>
          <Sub>setoran goal tahun ini</Sub>
        </Card>

        <Card emoji="📚" title="Belajar">
          <Big>{stats.pomodoroHours} jam</Big>
          <Sub>fokus dengan pomodoro</Sub>
        </Card>

        <Card emoji="💧" title="Sehat">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Air" value={`${stats.waterCups} gelas`} tone="default" />
            <Stat label="Olahraga" value={`${stats.exerciseSessions}×`} tone="default" />
            <Stat
              label="Mood rata2"
              value={stats.avgMood ? `${stats.avgMood}/5` : "—"}
              tone="default"
            />
          </div>
        </Card>

        <Card emoji="💌" title="Moments">
          <Big>{stats.momentsCount}</Big>
          <Sub>kenangan tertulis tahun ini</Sub>
        </Card>

        <p className="pt-4 text-center text-[10px] text-text-4">
          Twogether · Wrapped {YEAR}
        </p>
      </div>
    </div>
  );
}

function Card({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-base">{emoji}</span>
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-text-3">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[24px] font-bold leading-tight text-text-1">
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-0.5 text-[11px] text-text-3">{children}</div>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "default";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "rose"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : "bg-bg-elev1 text-text-1";
  return (
    <div className={`rounded-lg p-2 text-center ${toneClass}`}>
      <div className="text-[9px] font-medium uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="font-mono text-[12px] font-bold">{value}</div>
    </div>
  );
}
