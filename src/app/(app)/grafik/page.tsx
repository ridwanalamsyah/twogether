"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { Section } from "@/components/tracker/Section";
import { Sparkline } from "@/components/charts/Sparkline";
import { useAuth } from "@/stores/auth";
import {
  useEntries,
  useTransactions,
  useDeposits,
} from "@/stores/data";
import { todayISO } from "@/lib/utils";
import { useStableArray } from "@/lib/useStableArray";

export default function GrafikPage() {
  const userId = useAuth((s) => s.userId);
  const water = useStableArray(useEntries(userId, "water"));
  const weight = useStableArray(useEntries(userId, "weight"));
  const sleep = useStableArray(useEntries(userId, "sleep"));
  const mood = useStableArray(useEntries(userId, "mood"));
  const exercise = useStableArray(useEntries(userId, "exercise"));
  const pomodoro = useStableArray(useEntries(userId, "pomodoro"));
  const txs = useStableArray(useTransactions(userId));
  const deposits = useStableArray(useDeposits(userId));
  const expensePts = useMemo(
    () =>
      txs
        .filter((t) => t.kind === "out")
        .map((t) => ({ date: t.date, value: t.amount })),
    [txs],
  );
  const incomePts = useMemo(
    () =>
      txs
        .filter((t) => t.kind === "in")
        .map((t) => ({ date: t.date, value: t.amount })),
    [txs],
  );
  const depositPts = useMemo(
    () => deposits.map((d) => ({ date: d.date ?? todayISO(), value: d.amount })),
    [deposits],
  );

  const waterPts = water.map((e) => ({ date: e.date, value: e.valueNum ?? 0 }));
  const weightPts = weight.map((e) => ({ date: e.date, value: e.valueNum ?? 0 }));
  const sleepPts = sleep.map((e) => ({ date: e.date, value: e.valueNum ?? 0 }));
  const moodPts = mood.map((e) => ({ date: e.date, value: e.valueNum ?? 0 }));
  const exercisePts = exercise.map((e) => ({ date: e.date, value: e.valueNum ?? 0 }));
  const pomodoroPts = pomodoro.map((e) => ({ date: e.date, value: e.valueNum ?? 0 }));

  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Grafik"
        subtitle="Trend 30 hari terakhir"
        actions={
          <Link href="/home" className="text-[12px] text-text-3 active:opacity-50">
            Tutup
          </Link>
        }
      />
      <div className="px-5 space-y-5">
        <ChartCard title="Air minum">
          <Sparkline
            points={waterPts}
            formatTick={(v) => `${v} gelas`}
          />
        </ChartCard>
        <ChartCard title="Berat badan">
          <Sparkline points={weightPts} formatTick={(v) => `${v} kg`} />
        </ChartCard>
        <ChartCard title="Tidur (jam)">
          <Sparkline points={sleepPts} formatTick={(v) => `${v} jam`} />
        </ChartCard>
        <ChartCard title="Mood (1–5)">
          <Sparkline points={moodPts} />
        </ChartCard>
        <ChartCard title="Olahraga (menit)">
          <Sparkline points={exercisePts} formatTick={(v) => `${v} mnt`} />
        </ChartCard>
        <ChartCard title="Pomodoro (menit)">
          <Sparkline points={pomodoroPts} formatTick={(v) => `${v} mnt`} />
        </ChartCard>
        <ChartCard title="Pengeluaran harian">
          <Sparkline
            points={expensePts}
            formatTick={(v) => `Rp ${(v / 1000).toFixed(0)}k`}
          />
        </ChartCard>
        <ChartCard title="Pemasukan harian">
          <Sparkline
            points={incomePts}
            formatTick={(v) => `Rp ${(v / 1000).toFixed(0)}k`}
          />
        </ChartCard>
        <ChartCard title="Setoran goal">
          <Sparkline
            points={depositPts}
            formatTick={(v) => `Rp ${(v / 1000).toFixed(0)}k`}
          />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Section title={title} defaultOpen>
      <div className="py-2">{children}</div>
    </Section>
  );
}
