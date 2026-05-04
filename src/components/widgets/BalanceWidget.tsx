"use client";

import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { useTransactions, useDeposits } from "@/stores/data";
import { formatRupiahShort } from "@/lib/utils";
import { WidgetShell } from "./WidgetShell";

interface Stat {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative" | "neutral";
}

export function BalanceWidget() {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const txs = useTransactions(userId);
  const deps = useDeposits(userId);

  const stats: Stat[] = useMemo(() => {
    const tx = txs ?? [];
    const dp = deps ?? [];
    const sum = (xs: { amount: number }[]) =>
      xs.reduce((a, b) => a + b.amount, 0);

    const result: Stat[] = [];

    if (members.length === 0) {
      const sisa = sum(tx.filter((t) => t.kind === "in")) -
        sum(tx.filter((t) => t.kind === "out"));
      result.push({
        label: "Sisa kamu",
        value: formatRupiahShort(sisa),
        hint: `${tx.length} transaksi`,
        tone: sisa >= 0 ? "positive" : "negative",
      });
    } else {
      for (const m of members.slice(0, 2)) {
        const inM = tx.filter((t) => t.kind === "in" && t.who === m.name);
        const outM = tx.filter((t) => t.kind === "out" && t.who === m.name);
        const sisa = sum(inM) - sum(outM);
        result.push({
          label: `Sisa ${m.name.split(" ")[0]}`,
          value: formatRupiahShort(sisa),
          hint: `${inM.length + outM.length} transaksi`,
          tone: sisa >= 0 ? "positive" : "negative",
        });
      }
    }

    // Shared / "Bersama" stays a category if there are 2+ members.
    if (members.length >= 2) {
      const inS = tx.filter((t) => t.kind === "in" && t.who === sharedLabel);
      const outS = tx.filter((t) => t.kind === "out" && t.who === sharedLabel);
      const sisa = sum(inS) - sum(outS);
      result.push({
        label: `Sisa ${sharedLabel}`,
        value: formatRupiahShort(sisa),
        hint: `${inS.length + outS.length} transaksi`,
        tone: sisa >= 0 ? "positive" : "negative",
      });
    }

    result.push({
      label: "Total tabungan",
      value: formatRupiahShort(sum(dp)),
      hint: `${dp.length} setoran`,
      tone: "neutral",
    });

    if (result.length < 4) {
      result.push({
        label: "Bulan ini",
        value: formatRupiahShort(
          tx
            .filter(
              (t) =>
                t.kind === "out" &&
                new Date(t.date).getMonth() === new Date().getMonth(),
            )
            .reduce((a, b) => a + b.amount, 0),
        ),
        hint: "Pengeluaran",
        tone: "neutral",
      });
    }

    return result.slice(0, 4);
  }, [txs, deps, members, sharedLabel]);

  return (
    <WidgetShell title="Ringkasan">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {stats.map((s) => (
          <div key={s.label}>
            <div
              className={`font-mono text-[17px] font-semibold tracking-tight ${
                s.tone === "negative"
                  ? "text-[color:var(--negative)]"
                  : "text-text-1"
              }`}
            >
              {s.value}
            </div>
            <div className="mt-0.5 text-[11px] text-text-3">{s.label}</div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
