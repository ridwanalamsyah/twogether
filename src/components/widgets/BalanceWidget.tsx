"use client";

import { useNick } from "@/lib/nick";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { useTransactions, useDeposits, useItems, upsertItem } from "@/stores/data";
import { Sheet } from "@/components/ui/Sheet";
import { hapticTap } from "@/lib/haptic";
import { formatRupiahShort } from "@/lib/utils";
import { WidgetShell } from "./WidgetShell";
import { IconTile } from "@/lib/icons";
import { CreditCard, Eye, EyeOff, HandCoins, PiggyBank, Receipt, Wallet } from "lucide-react";
import { usePrivacy } from "@/stores/privacy";
import Link from "next/link";
import { useEntries } from "@/stores/data";
import { usePeople } from "@/lib/people";
import { splitBalance } from "@/lib/split";

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
  const custom = (s: Stat) => picks?.find((p) => p.title === s.key)?.status;
  const DEFAULT_SPECS = [
    { Icon: Wallet, tint: "var(--tint-green)" },
    { Icon: CreditCard, tint: "var(--tint-blue)" },
    { Icon: HandCoins, tint: "var(--tint-amber)" },
    { Icon: PiggyBank, tint: "var(--tint-purple)" },
  ];
  const specOf = (s: Stat, i: number) =>
    s.key === "tabungan"
      ? { Icon: PiggyBank, tint: "var(--tint-purple)" }
      : s.key === "bulan"
        ? { Icon: Receipt, tint: "var(--tint-rose)" }
        : DEFAULT_SPECS[i % DEFAULT_SPECS.length];
  async function choose(emoji: string) {
    if (!userId || !picking) return;
    const existing = picks?.find((p) => p.title === picking.key);
    await upsertItem(userId, { ...(existing ?? {}), kind: "tile-icon", title: picking.key, status: emoji });
    hapticTap();
    setPicking(null);
  }

  return (
    <WidgetShell title="Uang kita" action={<HideMoneyToggle />}>
      <div className="divide-y divide-[color:var(--hairline)]">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => setPicking(s)}
              aria-label={`Ganti ikon ${s.label}`}
              className="grid h-11 w-11 -ml-1.5 shrink-0 place-items-center rounded-full transition-transform active:scale-90"
            >
              {custom(s) ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1 text-[16px] leading-none">
                  {custom(s)}
                </span>
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
      <PatunganRow />
      <AnimatePresence>
        {picking && (
          <Sheet key={picking.key} title={`Ikon ${picking.label}`} onClose={() => setPicking(null)}>
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
              {ICONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => choose(e)}
                  aria-pressed={custom(picking) === e}
                  className={`grid min-h-[44px] aspect-square place-items-center rounded-xl text-[22px] transition-transform active:scale-90 ${
                    custom(picking) === e ? "bg-accent/10 ring-2 ring-accent" : "bg-bg-elev1"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Sheet>
        )}
      </AnimatePresence>
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
  const hidden = usePrivacy((s) => s.hideMoney);
  const reduced = useReducedMotion();
  const [peek, setPeek] = useState(false);
  const isBlurred = hidden && !peek;

  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ up: boolean; n: number } | null>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== amount) {
      setFlash((f) => ({ up: amount > prev.current!, n: (f?.n ?? 0) + 1 }));
    }
    prev.current = amount;
  }, [amount]);

  const cls = `num relative -mr-1.5 inline-flex min-h-[44px] items-center rounded-lg px-2 text-[15px] font-semibold tabular-nums select-none transition-colors ${
    negative ? "text-[color:var(--negative)]" : "text-text-1"
  } ${isBlurred ? "bg-bg-elev1/50" : ""}`;

  const inner = (
    <>
      {flash && !reduced && (
        <motion.span
          key={flash.n}
          aria-hidden
          className="absolute inset-0 rounded-md"
          style={{ background: flash.up !== !!spending ? "var(--positive)" : "var(--negative)" }}
          initial={{ opacity: 0.32, scale: 1.08 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <motion.span
        animate={{
          filter: isBlurred ? "blur(7px)" : "blur(0px)",
          opacity: isBlurred ? 0.65 : 1,
        }}
        transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
        className="inline-block"
      >
        <CountUp value={amount} format={formatRupiahShort} className="relative tracking-tight" />
      </motion.span>
    </>
  );

  if (hidden) {
    return (
      <motion.button
        type="button"
        onClick={() => {
          hapticTap();
          setPeek((p) => !p);
        }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
        aria-label="Intip nominal"
        aria-pressed={peek}
        className={`${cls} cursor-pointer`}
        title={peek ? "Ketuk untuk blur lagi" : "Ketuk untuk intip nominal"}
      >
        {inner}
      </motion.button>
    );
  }

  return <div className={cls}>{inner}</div>;
}

/** Eye button: hide every amount in the app (for when someone's watching). */
function HideMoneyToggle() {
  const hidden = usePrivacy((s) => s.hideMoney);
  const setHidden = usePrivacy((s) => s.setHideMoney);
  return (
    <button
      type="button"
      onClick={() => {
        hapticTap();
        setHidden(!hidden);
      }}
      aria-label={hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
      aria-pressed={hidden}
      className="-mr-2 -my-1.5 grid h-11 w-11 place-items-center rounded-full text-text-3 transition-transform active:scale-90"
    >
      {hidden ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
    </button>
  );
}

/** Who owes whom from shared bills, right under the balances (hidden when even). */
function PatunganRow() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const splits = useEntries(userId, "split");
  const settles = useEntries(userId, "split-settle");
  if (!partner || !splits || !settles) return null;
  const net = splitBalance([...splits, ...settles], me);
  if (net === 0) return null;
  const text = net > 0 ? `${nick(partner)} perlu ganti` : "Kamu perlu ganti";
  return (
    <Link
      href="/patungan"
      className="mt-1 flex min-h-[44px] items-center gap-3 border-t border-[color:var(--hairline)] pt-2.5 active:opacity-70"
    >
      <IconTile spec={{ Icon: HandCoins, tint: "var(--tint-amber)" }} size={32} radius={999} />
      <div className="min-w-0 flex-1 truncate text-[14px] text-text-2">{text}</div>
      <div className="num text-[15px] font-semibold text-text-1">{formatRupiahShort(Math.abs(net))}</div>
    </Link>
  );
}
