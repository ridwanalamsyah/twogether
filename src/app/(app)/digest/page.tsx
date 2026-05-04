"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  useDeposits,
  useGoals,
  useReflections,
  useTransactions,
} from "@/stores/data";
import { useWorkspace } from "@/stores/workspace";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";

const DAY = 1000 * 60 * 60 * 24;

export default function DigestPage() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId) ?? [];
  const goals = useGoals(userId) ?? [];
  const deposits = useDeposits(userId) ?? [];
  const reflections = useReflections(userId) ?? [];
  const members = useWorkspace((s) => s.members);

  const range = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dow = now.getDay();
    const monOffset = dow === 0 ? -6 : 1 - dow;
    const thisMon = new Date(now.getTime() + monOffset * DAY);
    const lastMon = new Date(thisMon.getTime() - 7 * DAY);
    const lastSun = new Date(thisMon.getTime() - DAY);
    return {
      lastWeekStart: lastMon,
      lastWeekEnd: lastSun,
      thisWeekStart: thisMon,
    };
  }, []);

  const stats = useMemo(() => {
    const inRange = (d: string) => {
      const t = new Date(d).getTime();
      return (
        t >= range.lastWeekStart.getTime() && t <= range.lastWeekEnd.getTime()
      );
    };

    const lastTxs = txs.filter((t) => inRange(t.date));
    const lastDeposits = deposits.filter((d) => inRange(d.date));

    const totalIn = lastTxs
      .filter((t) => t.kind === "in")
      .reduce((a, t) => a + t.amount, 0);
    const totalOut = lastTxs
      .filter((t) => t.kind === "out")
      .reduce((a, t) => a + t.amount, 0);
    const totalDeposits = lastDeposits.reduce((a, d) => a + d.amount, 0);

    const byCat = new Map<string, number>();
    for (const t of lastTxs) {
      if (t.kind !== "out") continue;
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    }
    const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    const byMember = new Map<string, number>();
    for (const t of lastTxs) {
      if (t.kind !== "out") continue;
      byMember.set(t.who, (byMember.get(t.who) ?? 0) + t.amount);
    }

    const lastReflections = reflections.filter((r) => inRange(r.date));
    const avgMood = lastReflections.length
      ? lastReflections.reduce((a, r) => a + r.mood, 0) /
        lastReflections.length
      : 0;

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      totalDeposits,
      topCat,
      byMember,
      avgMood,
      reflectionCount: lastReflections.length,
      txCount: lastTxs.length,
    };
  }, [txs, deposits, reflections, range]);

  const targets = useMemo(() => {
    return goals
      .filter((g) => !!g.deadline)
      .map((g) => {
        const saved = deposits
          .filter((d) => d.goalId === g.id)
          .reduce((a, d) => a + d.amount, 0);
        const remaining = Math.max(0, g.target - saved);
        const deadline = g.deadline ? new Date(g.deadline) : null;
        const weeksLeft = deadline
          ? Math.max(
              1,
              Math.round(
                (deadline.getTime() - Date.now()) / (DAY * 7),
              ),
            )
          : null;
        const perWeek = weeksLeft ? remaining / weeksLeft : 0;
        const perPersonPerWeek =
          members.length > 0 ? perWeek / members.length : perWeek;
        return { goal: g, remaining, weeksLeft, perWeek, perPersonPerWeek };
      })
      .filter((t) => t.remaining > 0)
      .slice(0, 3);
  }, [goals, deposits, members]);

  const moodEmoji = ["😞", "😕", "😐", "🙂", "🤩"];
  const dateRangeText = `${range.lastWeekStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${range.lastWeekEnd.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;

  return (
    <div className="animate-in">
      <AppHeader
        title="Digest"
        subtitle={dateRangeText}
        actions={
          <Link
            href="/home"
            className="text-[12px] text-text-3 active:opacity-50"
          >
            Tutup
          </Link>
        }
      />

      <div className="px-5 pt-4 pb-8">
        <section>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-border pb-4">
            <Stat label="Pemasukan" value={formatRupiahShort(stats.totalIn)} tone="positive" />
            <Stat label="Pengeluaran" value={formatRupiahShort(stats.totalOut)} />
            <Stat label="Setoran goal" value={formatRupiahShort(stats.totalDeposits)} />
            <Stat
              label={stats.net >= 0 ? "Surplus" : "Defisit"}
              value={formatRupiahShort(Math.abs(stats.net))}
              tone={stats.net >= 0 ? "positive" : "negative"}
            />
          </div>
          <div className="mt-2 text-[11px] text-text-4">
            {stats.txCount} transaksi · mood{" "}
            {stats.reflectionCount > 0
              ? `${moodEmoji[Math.round(stats.avgMood) - 1] ?? "·"} ${stats.avgMood.toFixed(1)}/5`
              : "belum ada"}
          </div>
        </section>

        {stats.topCat.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Top pengeluaran
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {stats.topCat.map(([cat, amt]) => {
                const share = Math.round(
                  (amt / Math.max(1, stats.totalOut)) * 100,
                );
                return (
                  <li key={cat} className="flex justify-between py-2 text-[13px]">
                    <span className="text-text-1">
                      {cat}{" "}
                      <span className="text-[11px] text-text-4">{share}%</span>
                    </span>
                    <span className="font-mono tabular-nums text-text-2">
                      {formatRupiahShort(amt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {members.length >= 2 && stats.byMember.size > 0 && (
          <section className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Per anggota
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {[...stats.byMember.entries()].map(([who, amt]) => (
                <li key={who} className="flex justify-between py-2 text-[13px]">
                  <span className="text-text-1">{who}</span>
                  <span className="font-mono tabular-nums text-text-2">
                    {formatRupiahShort(amt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {targets.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Target minggu ini
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {targets.map(({ goal, remaining, weeksLeft, perPersonPerWeek }) => (
                <li key={goal.id} className="py-2.5">
                  <div className="text-[13px] font-medium text-text-1">{goal.name}</div>
                  <div className="mt-0.5 text-[11px] text-text-4">
                    Sisa {formatRupiahShort(remaining)} · {weeksLeft} minggu
                  </div>
                  <div className="mt-0.5 text-[12px] text-text-2">
                    {formatRupiah(Math.round(perPersonPerWeek))}/orang/minggu
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 text-[11px] text-text-4">
          Tip: buka digest tiap Senin pagi sebagai check-in mingguan.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const color =
    tone === "positive"
      ? "text-[color:var(--positive)]"
      : tone === "negative"
        ? "text-[color:var(--negative)]"
        : "text-text-1";
  return (
    <div>
      <div className="text-[11px] text-text-4">{label}</div>
      <div
        className={`mt-1 font-mono text-[18px] font-semibold tabular-nums tracking-tight ${color}`}
      >
        {value}
      </div>
    </div>
  );
}
