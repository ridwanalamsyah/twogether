"use client";

import { useMemo } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { useGoals, useDeposits, useTransactions } from "@/stores/data";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { TrackerInsights } from "@/components/insights/TrackerInsights";
import { useStableArray } from "@/lib/useStableArray";

export default function InsightsPage() {
  const userId = useAuth((s) => s.userId);
  const txs = useStableArray(useTransactions(userId));
  const goals = useStableArray(useGoals(userId));
  const deposits = useStableArray(useDeposits(userId));
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);

  /* ───── Month totals ───── */
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const thisMonth = useMemo(
    () => txs.filter((t) => new Date(t.date).getTime() >= monthStart),
    [txs, monthStart],
  );
  const monthIn = sum(thisMonth.filter((t) => t.kind === "in"));
  const monthOut = sum(thisMonth.filter((t) => t.kind === "out"));

  /* ───── Per-member ───── */
  const perMember = useMemo(() => {
    return members.map((m) => {
      const inM = sum(
        thisMonth.filter((t) => t.kind === "in" && t.who === m.name),
      );
      const outM = sum(
        thisMonth.filter((t) => t.kind === "out" && t.who === m.name),
      );
      return { name: m.name, in: inM, out: outM, net: inM - outM };
    });
  }, [members, thisMonth]);

  const shared = useMemo(() => {
    const inM = sum(
      thisMonth.filter((t) => t.kind === "in" && t.who === sharedLabel),
    );
    const outM = sum(
      thisMonth.filter((t) => t.kind === "out" && t.who === sharedLabel),
    );
    return { in: inM, out: outM };
  }, [thisMonth, sharedLabel]);

  /* ───── Split-bill ───── */
  const splitBill = useMemo(() => {
    if (members.length !== 2) return null;
    const [a, b] = members;
    // Pseudo "Bersama" expenses split 50/50 — each owes half.
    const sharedOut = sum(
      thisMonth.filter((t) => t.kind === "out" && t.who === sharedLabel),
    );
    const half = sharedOut / 2;
    const aOutShared = sum(
      thisMonth.filter(
        (t) =>
          t.kind === "out" &&
          t.category?.toLowerCase().includes("bareng") &&
          t.who === a.name,
      ),
    );
    const bOutShared = sum(
      thisMonth.filter(
        (t) =>
          t.kind === "out" &&
          t.category?.toLowerCase().includes("bareng") &&
          t.who === b.name,
      ),
    );
    const aPaid = half + aOutShared;
    const bPaid = half + bOutShared;
    const diff = aPaid - bPaid;
    if (Math.abs(diff) < 1) return null;
    return diff > 0
      ? { debtor: b.name, creditor: a.name, amount: diff }
      : { debtor: a.name, creditor: b.name, amount: -diff };
  }, [members, thisMonth, sharedLabel]);

  /* ───── Heatmap last 12 weeks ───── */
  const heatmap = useMemo(() => {
    const weeks: { date: string; total: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 11 * 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const total = sum(txs.filter((t) => t.kind === "out" && t.date === iso));
      weeks.push({ date: iso, total });
    }
    const max = Math.max(1, ...weeks.map((w) => w.total));
    return { weeks, max };
  }, [txs]);

  /* ───── Goals per-member contribution ───── */
  const goalBreakdown = useMemo(() => {
    return goals.slice(0, 3).map((g) => {
      const gDeps = deposits.filter((d) => d.goalId === g.id);
      const total = sum(gDeps);
      const byMember = members.map((m) => ({
        name: m.name,
        amt: sum(gDeps.filter((d) => d.who === m.name)),
      }));
      return { goal: g, total, byMember };
    });
  }, [goals, deposits, members]);

  /* ───── Anomaly detection (per-category vs 3-month avg) ───── */
  const anomalies = useMemo(() => {
    const now = new Date();
    const monthStartT = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const threeMoStart = new Date(
      now.getFullYear(),
      now.getMonth() - 3,
      1,
    ).getTime();

    const currMonth = txs.filter(
      (t) => t.kind === "out" && new Date(t.date).getTime() >= monthStartT,
    );
    const baseline = txs.filter(
      (t) =>
        t.kind === "out" &&
        new Date(t.date).getTime() >= threeMoStart &&
        new Date(t.date).getTime() < monthStartT,
    );

    const currByCat = new Map<string, number>();
    for (const t of currMonth)
      currByCat.set(t.category, (currByCat.get(t.category) ?? 0) + t.amount);

    const baseByCat = new Map<string, number>();
    for (const t of baseline)
      baseByCat.set(t.category, (baseByCat.get(t.category) ?? 0) + t.amount);

    const flagged: { category: string; current: number; avg: number; ratio: number }[] = [];
    for (const [cat, curr] of currByCat) {
      const total3 = baseByCat.get(cat) ?? 0;
      const avg = total3 / 3;
      if (avg < 50_000) continue; // skip sub-Rp50k baselines
      if (curr >= avg * 2) {
        flagged.push({ category: cat, current: curr, avg, ratio: curr / avg });
      }
    }
    flagged.sort((a, b) => b.ratio - a.ratio);
    return flagged.slice(0, 3);
  }, [txs]);

  /* ───── Smart insights (rule-based) ───── */
  const insights = useMemo(() => {
    const out: string[] = [];
    if (thisMonth.length === 0) {
      out.push("Bulan ini belum ada transaksi — yuk mulai catat!");
      return out;
    }
    for (const a of anomalies) {
      out.push(
        `⚠️ Pengeluaran "${a.category}" bulan ini ${a.ratio.toFixed(1)}× lipat dari rata-rata 3 bulan terakhir (${formatRupiah(a.current)} vs ${formatRupiah(Math.round(a.avg))}).`,
      );
    }
    if (monthOut > 0) {
      out.push(
        `Bulan ini keluar ${formatRupiah(monthOut)} dari ${thisMonth.filter(
          (t) => t.kind === "out",
        ).length} transaksi.`,
      );
    }
    if (monthIn > 0) {
      out.push(`Pemasukan bulan ini ${formatRupiah(monthIn)}.`);
    }
    // Top category
    const catMap = new Map<string, number>();
    for (const t of thisMonth.filter((t) => t.kind === "out")) {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
    }
    const top = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const share = Math.round((top[1] / Math.max(1, monthOut)) * 100);
      out.push(
        `${share}% pengeluaran buat kategori "${top[0]}" (${formatRupiah(top[1])}). Coba review apa ini bisa di-cut.`,
      );
    }
    // Goal pacing
    for (const g of goals.slice(0, 2)) {
      const gd = deposits.filter((d) => d.goalId === g.id);
      const saved = sum(gd);
      const pct = Math.round((saved / Math.max(1, g.target)) * 100);
      if (pct >= 100) {
        out.push(`🎉 Goal "${g.name}" sudah tercapai!`);
      } else if (g.deadline) {
        const daysLeft = Math.max(
          0,
          Math.ceil(
            (new Date(g.deadline).getTime() - Date.now()) / 864e5,
          ),
        );
        if (daysLeft > 0) {
          const remain = g.target - saved;
          const perWeek = Math.ceil(remain / Math.max(1, daysLeft / 7));
          out.push(
            `Goal "${g.name}": butuh ${formatRupiah(perWeek)}/minggu biar tercapai sebelum ${new Date(
              g.deadline,
            ).toLocaleDateString("id-ID")}.`,
          );
        }
      }
    }
    return out;
  }, [thisMonth, goals, deposits, monthIn, monthOut, anomalies]);

  return (
    <div className="animate-in">
      <AppHeader title="Insights" />

      <div className="px-5 pt-4 pb-8">
        <section className="grid grid-cols-2 gap-6 border-b border-border pb-4">
          <Stat label="Masuk bulan ini" value={formatRupiahShort(monthIn)} tone="positive" />
          <Stat label="Keluar bulan ini" value={formatRupiahShort(monthOut)} tone="negative" />
        </section>

        <section className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
            Insights
          </div>
          <ul className="space-y-1.5 text-[13px] text-text-2">
            {insights.map((i, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-text-4">—</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </section>

        {perMember.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Per anggota
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {perMember.map((m) => (
                <li key={m.name} className="flex items-center justify-between py-2.5">
                  <span className="text-[13px] font-medium text-text-1">{m.name}</span>
                  <div className="text-right text-[12px] font-mono tabular-nums">
                    <span className="text-[color:var(--positive)]">+{formatRupiahShort(m.in)}</span>
                    <span className="ml-3 text-text-3">−{formatRupiahShort(m.out)}</span>
                  </div>
                </li>
              ))}
              {members.length >= 2 && (
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-[13px] font-medium text-text-3">{sharedLabel}</span>
                  <div className="text-right text-[12px] font-mono tabular-nums">
                    <span className="text-[color:var(--positive)]">+{formatRupiahShort(shared.in)}</span>
                    <span className="ml-3 text-text-3">−{formatRupiahShort(shared.out)}</span>
                  </div>
                </li>
              )}
            </ul>
          </section>
        )}

        {splitBill && (
          <section className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Split bill
            </div>
            <div className="border-y border-border py-3">
              <div className="text-[13px] text-text-1">
                <span className="font-medium">{splitBill.debtor}</span> utang ke{" "}
                <span className="font-medium">{splitBill.creditor}</span>
              </div>
              <div className="mt-1 font-mono text-[15px] font-medium tabular-nums text-text-1">
                {formatRupiah(splitBill.amount)}
              </div>
              <p className="mt-1 text-[11px] text-text-4">
                Estimasi split 50/50 untuk kategori “Bersama”.
              </p>
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
            Heatmap (12 minggu)
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-0.5">
            {heatmap.weeks.map((w) => {
              const intensity = w.total / heatmap.max;
              const bg =
                w.total === 0
                  ? "var(--bg-elev2)"
                  : `color-mix(in srgb, var(--accent) ${Math.round(
                      20 + intensity * 80,
                    )}%, transparent)`;
              return (
                <div
                  key={w.date}
                  title={`${w.date}: ${formatRupiah(w.total)}`}
                  className="h-3 w-3 rounded-sm"
                  style={{ background: bg }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-text-3">
            <span>Sedikit</span>
            <span className="h-2 w-2 rounded-sm bg-bg-elev2" />
            <span
              className="h-2 w-2 rounded-sm"
              style={{
                background:
                  "color-mix(in srgb, var(--accent) 40%, transparent)",
              }}
            />
            <span
              className="h-2 w-2 rounded-sm"
              style={{
                background:
                  "color-mix(in srgb, var(--accent) 100%, transparent)",
              }}
            />
            <span>Banyak</span>
          </div>
        </section>

        {goalBreakdown.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Kontribusi goal
            </div>
            <div className="space-y-3">
              {goalBreakdown.map(({ goal, total, byMember }) => {
                const pct = Math.min(
                  100,
                  Math.round((total / Math.max(1, goal.target)) * 100),
                );
                return (
                  <div key={goal.id}>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="text-text-1">{goal.name}</span>
                      <span className="font-mono tabular-nums text-text-3">{pct}%</span>
                    </div>
                    <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {byMember.length > 0 && (
                      <div className="mt-1 flex gap-2 text-[10px] text-text-4">
                        {byMember.map((b) => (
                          <span key={b.name}>
                            {b.name}: {formatRupiahShort(b.amt)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <TrackerInsights />
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
  tone: "positive" | "negative";
}) {
  return (
    <div>
      <div className="text-[11px] text-text-4">{label}</div>
      <div
        className={`mt-1 font-mono text-[20px] font-semibold tracking-tight tabular-nums ${
          tone === "positive" ? "text-[color:var(--positive)]" : "text-text-1"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function sum(xs: { amount: number }[]): number {
  return xs.reduce((a, b) => a + b.amount, 0);
}
