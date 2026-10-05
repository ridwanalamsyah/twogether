"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useDeposits, useEntries, useItems, useTransactions } from "@/stores/data";
import { monthEnds, netWorthAt, type NetWorthInput } from "@/lib/networth";
import { fromIsoDay } from "@/lib/people";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";

const RANGES = [6, 12] as const;

export default function AsetPage() {
  const userId = useAuth((s) => s.userId);
  const walletItems = useItems(userId, "wallet");
  const txs = useTransactions(userId);
  const transfers = useEntries(userId, "wallet-transfer");
  const deposits = useDeposits(userId);
  const debts = useItems(userId, "debt");
  const bills = useItems(userId, "bill");
  const billPaid = useEntries(userId, "bill-paid");
  const [range, setRange] = useState<(typeof RANGES)[number]>(6);
  const [pick, setPick] = useState<number | null>(null);

  const input: NetWorthInput | null =
    walletItems && txs && transfers && deposits && debts && bills && billPaid
      ? { walletItems, txs, transfers, deposits, debts, bills, billPaid }
      : null;

  const series = useMemo(
    () => (input ? monthEnds(range).map((d) => ({ d, nw: netWorthAt(d, input) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletItems, txs, transfers, deposits, debts, bills, billPaid, range],
  );
  if (!input) return null;

  const now = series[series.length - 1]?.nw;
  const prev = series[series.length - 2]?.nw;
  const change = now && prev ? now.total - prev.total : 0;
  const values = series.map((x) => x.nw.total);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const zero = (max / span) * 100; // % from top where the baseline sits
  const shown = pick != null ? series[pick] : null;
  const hasWallets = input.walletItems.some((w) => w.status !== "archived");

  return (
    <div>
      <AppHeader title="Aset bersih" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div className="rounded-[24px] p-5 text-white shadow-float" style={{ background: "linear-gradient(135deg,#0f766e,#2563eb)" }}>
          <div className="text-[13px] font-semibold text-white/85">Total kekayaan berdua</div>
          <div className="mt-1 font-mono text-[32px] font-extrabold leading-tight">{formatRupiah(now?.total ?? 0)}</div>
          {prev && (
            <div className="mt-1 text-[13px] text-white/90">
              {change >= 0 ? "▲" : "▼"} {formatRupiahShort(Math.abs(change))} dari akhir bulan lalu
            </div>
          )}
        </div>

        {!hasWallets && (
          <Link href="/dompet" className="block rounded-2xl bg-[color:var(--warning-bg)] px-4 py-3 text-[13px] text-[color:var(--warning)]">
            Tambahkan dompet (rekening, e-wallet, tunai) beserta saldo awalnya supaya angka ini akurat →
          </Link>
        )}

        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-text-1">Dari bulan ke bulan</h2>
            <div className="flex gap-1 rounded-full bg-bg-elev2 p-0.5 text-[12px] font-semibold">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRange(r);
                    setPick(null);
                  }}
                  className={`rounded-full px-2.5 py-1 ${range === r ? "bg-bg-card text-text-1 shadow-sm" : "text-text-3"}`}
                >
                  {r} bln
                </button>
              ))}
            </div>
          </div>
          <div className="mb-1 h-5 text-[12px] text-text-3">
            {shown
              ? `${fromIsoDay(shown.d).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}: ${formatRupiah(shown.nw.total)}`
              : "Ketuk batang untuk lihat angkanya"}
          </div>
          <div className="relative h-40" onMouseLeave={() => setPick(null)}>
            <span aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: `${zero}%` }} />
            <div className="absolute inset-0 flex gap-2">
              {series.map((x, i) => {
                const v = x.nw.total;
                const h = (Math.abs(v) / span) * 100;
                const last = i === series.length - 1;
                return (
                  <button
                    key={x.d}
                    onMouseEnter={() => setPick(i)}
                    onClick={() => setPick(pick === i ? null : i)}
                    className="relative h-full flex-1"
                    aria-label={`${x.d}: ${formatRupiah(v)}`}
                  >
                    <span
                      className={`absolute inset-x-[15%] transition-opacity ${v >= 0 ? "rounded-t-[4px]" : "rounded-b-[4px]"} ${pick != null && pick !== i ? "opacity-40" : ""}`}
                      style={{
                        top: v >= 0 ? `${zero - h}%` : `${zero}%`,
                        height: `${Math.max(v ? 1.5 : 0, h)}%`,
                        background: v < 0 ? "var(--negative)" : last ? "var(--accent)" : "color-mix(in srgb, var(--accent) 55%, var(--bg-elev2))",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-1.5 flex gap-2 text-center text-[10px] text-text-4">
            {series.map((x) => (
              <span key={x.d} className="flex-1">{fromIsoDay(x.d).toLocaleDateString("id-ID", { month: "short" })}</span>
            ))}
          </div>
        </section>

        {now && (
          <section className="surface p-4">
            <h2 className="mb-2 text-[15px] font-bold text-text-1">Rinciannya</h2>
            {[
              { label: "👛 Saldo dompet", v: now.wallets, href: "/dompet" },
              { label: "🎯 Tabungan Goals", v: now.savings, href: "/goals" },
              { label: "🤝 Piutang (dipinjam orang)", v: now.lent, href: "/uang" },
              { label: "💳 Hutang", v: -now.owe, href: "/uang" },
              { label: "📲 Sisa cicilan", v: -now.installments, href: "/tagihan" },
            ].map((r) => (
              <Link key={r.label} href={r.href} className="flex items-center justify-between border-b border-border py-2.5 text-[14px] last:border-0">
                <span className="text-text-2">{r.label}</span>
                <span className={`font-mono font-semibold ${r.v < 0 ? "text-[color:var(--negative)]" : "text-text-1"}`}>
                  {r.v < 0 ? "−" : ""}{formatRupiah(Math.abs(r.v))}
                </span>
              </Link>
            ))}
          </section>
        )}
        <p className="px-1 text-[11px] leading-snug text-text-4">
          Dihitung dari dompet, Goals, hutang/piutang, dan cicilan yang dicatat di Twogether. Barang seperti motor atau emas belum ikut dihitung.
        </p>
      </div>
    </div>
  );
}
