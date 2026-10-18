"use client";

import { useNick } from "@/lib/nick";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { useTransactions, useDeposits, useItems, upsertItem } from "@/stores/data";
import { Sheet } from "@/components/ui/Sheet";
import { hapticTap } from "@/lib/haptic";
import { formatRupiahShort } from "@/lib/utils";
import { WidgetShell } from "./WidgetShell";
import { IconTile } from "@/lib/icons";
import { CreditCard, HandCoins, PiggyBank, Receipt, Wallet } from "lucide-react";

interface Stat {
  /** Stable key for the tile's icon choice. */
  key: string;
  label: string;
  value: string;
  /** Raw number behind `value`, animated on screen. */
  amount: number;
  hint?: string;
  tone?: "positive" | "negative" | "neutral";
}

const TINTS = [
  { emoji: "👛", bg: "color-mix(in srgb, var(--positive) 12%, transparent)" },
  { emoji: "💳", bg: "color-mix(in srgb, var(--accent) 12%, transparent)" },
  { emoji: "🧾", bg: "color-mix(in srgb, var(--warning) 14%, transparent)" },
  { emoji: "💸", bg: "color-mix(in srgb, var(--info) 12%, transparent)" },
];

const ICONS = [
  "👛", "💳", "💵", "💰", "🏦", "🪙", "💸", "🧾", "🐷", "🛍️",
  "👩", "👨", "🧕", "🧔", "👸", "🤴", "🐱", "🐶", "🐰", "🐻",
  "🐼", "🦊", "🐥", "🌸", "🌻", "⭐", "🌙", "☀️", "💗", "💙",
  "🍓", "🍀", "🎀", "🎧", "⚽", "🎮", "📚", "☕", "🏠", "🤝",
];

export function BalanceWidget() {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const txs = useTransactions(userId);
  const deps = useDeposits(userId);
  const { nick } = useNick();

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
        key: "me",
        label: "Sisa kamu",
        value: formatRupiahShort(sisa),
        amount: sisa,
        hint: `${tx.length} transaksi`,
        tone: sisa >= 0 ? "positive" : "negative",
      });
    } else {
      for (const m of members.slice(0, 2)) {
        const inM = tx.filter((t) => t.kind === "in" && t.who === m.name);
        const outM = tx.filter((t) => t.kind === "out" && t.who === m.name);
        const sisa = sum(inM) - sum(outM);
        result.push({
          key: `member:${m.name}`,
          label: `Sisa ${nick(m.name) !== m.name ? nick(m.name) : m.name.split(" ")[0]}`,
          value: formatRupiahShort(sisa),
        amount: sisa,
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
        key: "shared",
        label: `Sisa ${sharedLabel}`,
        value: formatRupiahShort(sisa),
        amount: sisa,
        hint: `${inS.length + outS.length} transaksi`,
        tone: sisa >= 0 ? "positive" : "negative",
      });
    }

    result.push({
      key: "tabungan",
      label: "Total tabungan",
      value: formatRupiahShort(sum(dp)),
      amount: sum(dp),
      hint: `${dp.length} setoran`,
      tone: "neutral",
    });

    if (result.length < 4) {
      result.push({
        key: "bulan",
        label: "Bulan ini",
        ...(() => {
          const amount = tx
            .filter(
              (t) =>
                t.kind === "out" &&
                new Date(t.date).getMonth() === new Date().getMonth(),
            )
            .reduce((a, b) => a + b.amount, 0);
          return { amount, value: formatRupiahShort(amount) };
        })(),
        hint: "Pengeluaran",
        tone: "neutral",
      });
    }

    return result.slice(0, 4);
  }, [txs, deps, members, sharedLabel, nick]);

  // Icon choices are synced so both phones show the same faces.
  const picks = useItems(userId, "tile-icon");
  const [picking, setPicking] = useState<Stat | null>(null);
  const iconOf = (s: Stat, i: number) =>
    picks?.find((p) => p.title === s.key)?.status || TINTS[i % TINTS.length].emoji;
  const custom = (s: Stat) => picks?.find((p) => p.title === s.key)?.status;
  const DEFAULT_SPECS = [
    { Icon: Wallet, tint: "#22c55e" },
    { Icon: CreditCard, tint: "#3b82f6" },
    { Icon: HandCoins, tint: "#f59e0b" },
    { Icon: PiggyBank, tint: "#a855f7" },
  ];
  const specOf = (s: Stat, i: number) =>
    s.key === "tabungan" ? { Icon: PiggyBank, tint: "#a855f7" } : s.key === "bulan" ? { Icon: Receipt, tint: "#f43f5e" } : DEFAULT_SPECS[i % DEFAULT_SPECS.length];
  async function choose(emoji: string) {
    if (!userId || !picking) return;
    const existing = picks?.find((p) => p.title === picking.key);
    await upsertItem(userId, { ...(existing ?? {}), kind: "tile-icon", title: picking.key, status: emoji });
    hapticTap();
    setPicking(null);
  }

  return (
    <WidgetShell title="Uang kita">
      <div className="divide-y divide-[color:var(--hairline)]">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3 py-2.5">
            <button
              onClick={() => setPicking(s)}
              aria-label={`Ganti ikon ${s.label}`}
              className="rounded-full active:scale-90"
            >
              {custom(s) ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1 text-[16px] leading-none">{custom(s)}</span>
              ) : (
                <IconTile spec={specOf(s, i)} size={32} radius={999} />
              )}
            </button>
            <div className="min-w-0 flex-1 truncate text-[14px] text-text-2">{s.label}</div>
            <AnimatedAmount
              amount={s.amount}
              negative={s.tone === "negative"}
              spending={s.key === "bulan"}
            />
          </div>
        ))}
      </div>
      {picking && (
        <Sheet title={`Ikon ${picking.label}`} onClose={() => setPicking(null)}>
          <div className="grid grid-cols-8 gap-1.5">
            {ICONS.map((e) => (
              <button
                key={e}
                onClick={() => choose(e)}
                className={`grid aspect-square place-items-center rounded-xl text-[22px] active:scale-90 ${
                  iconOf(picking, stats.indexOf(picking)) === e ? "bg-accent/10 ring-2 ring-accent" : "bg-bg-elev1"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </WidgetShell>
  );
}

/**
 * Counts up on first show; when the number later changes (a new
 * transaction), it eases to the new value with a short green/red glow.
 */
function AnimatedAmount({
  amount,
  negative,
  spending,
}: {
  amount: number;
  negative: boolean;
  /** For spending totals a rise is bad news, so it glows red. */
  spending?: boolean;
}) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ up: boolean; n: number } | null>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== amount) {
      setFlash((f) => ({ up: amount > prev.current!, n: (f?.n ?? 0) + 1 }));
    }
    prev.current = amount;
  }, [amount]);

  return (
    <div
      className={`num relative -mr-1.5 px-1.5 text-[15px] font-semibold ${
        negative ? "text-[color:var(--negative)]" : "text-text-1"
      }`}
    >
      {flash && (
        <motion.span
          key={flash.n}
          aria-hidden
          className="absolute inset-0 rounded-md"
          style={{ background: flash.up !== !!spending ? "var(--positive)" : "var(--negative)" }}
          initial={{ opacity: 0.32, scale: 1.12 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <CountUp value={amount} format={formatRupiahShort} className="relative" />
    </div>
  );
}
