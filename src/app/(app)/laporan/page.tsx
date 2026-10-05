"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useTransactions } from "@/stores/data";
import { useWallets } from "@/components/wallet/Wallets";
import { walletOf } from "@/lib/wallet";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { fromIsoDay, isoDay } from "@/lib/people";
import type { TransactionRecord } from "@/lib/db";

function monthKey(d: Date) {
  return isoDay(d).slice(0, 7);
}
function shiftMonth(key: string, n: number) {
  const d = fromIsoDay(`${key}-01`);
  return monthKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

function summarize(txs: TransactionRecord[]) {
  let inc = 0;
  let out = 0;
  for (const t of txs) {
    if (t.kind === "in") inc += t.amount;
    else out += t.amount;
  }
  return { inc, out, net: inc - out };
}

export default function LaporanPage() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId) ?? [];
  const { wallets } = useWallets();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [hover, setHover] = useState<string | null>(null);

  const cur = useMemo(() => txs.filter((t) => t.date.startsWith(month)), [txs, month]);
  const prev = useMemo(() => txs.filter((t) => t.date.startsWith(shiftMonth(month, -1))), [txs, month]);
  const s = summarize(cur);
  const p = summarize(prev);
  const outChange = p.out > 0 ? Math.round(((s.out - p.out) / p.out) * 100) : null;
  const saveRate = s.inc > 0 ? Math.round((s.net / s.inc) * 100) : null;

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of cur) if (t.kind === "out") m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [cur]);
  const prevByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of prev) if (t.kind === "out") m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return m;
  }, [prev]);
  const byWho = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of cur) if (t.kind === "out") m.set(t.who, (m.get(t.who) ?? 0) + t.amount);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [cur]);
  const byWallet = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of cur) {
      if (t.kind !== "out") continue;
      const w = walletOf(t) ?? "";
      m.set(w, (m.get(w) ?? 0) + t.amount);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [cur]);
  const top = [...cur].filter((t) => t.kind === "out").sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Daily spending columns.
  const first = fromIsoDay(`${month}-01`);
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const daily = Array.from({ length: dim }, (_, i) => {
    const d = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { d, v: cur.filter((t) => t.kind === "out" && t.date === d).reduce((a, t) => a + t.amount, 0) };
  });
  const maxDay = Math.max(1, ...daily.map((x) => x.v));
  const hovered = daily.find((x) => x.d === hover);
  const maxCat = Math.max(1, ...byCat.map(([, v]) => v));

  return (
    <div>
      <AppHeader title="Laporan" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="grid h-9 w-9 place-items-center rounded-full bg-bg-card text-text-2 shadow-card" aria-label="Bulan sebelumnya">‹</button>
          <div className="text-[17px] font-extrabold text-text-1">
            {first.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= monthKey(new Date())}
            className="grid h-9 w-9 place-items-center rounded-full bg-bg-card text-text-2 shadow-card disabled:opacity-40"
            aria-label="Bulan berikutnya"
          >
            ›
          </button>
        </div>

        {cur.length === 0 ? (
          <div className="rounded-[20px] border-2 border-dashed border-border py-12 text-center text-[13px] text-text-3">
            Belum ada transaksi di bulan ini.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Tile label="Pengeluaran" value={formatRupiah(s.out)} sub={outChange == null ? "—" : `${outChange > 0 ? "▲" : "▼"} ${Math.abs(outChange)}% dari bulan lalu`} />
              <Tile label="Pemasukan" value={formatRupiah(s.inc)} sub={`Bulan lalu ${formatRupiahShort(p.inc)}`} />
              <Tile label="Sisa" value={formatRupiah(s.net)} sub={saveRate == null ? "—" : `${saveRate}% dari pemasukan`} negative={s.net < 0} />
              <Tile label="Rata-rata / hari" value={formatRupiahShort(Math.round(s.out / dim))} sub={`${cur.filter((t) => t.kind === "out").length} transaksi keluar`} />
            </div>

            <section className="surface p-4">
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-[15px] font-bold text-text-1">Pengeluaran harian</h2>
                <span className="text-[12px] text-text-3">
                  {hovered ? `${fromIsoDay(hovered.d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })}: ${formatRupiah(hovered.v)}` : `Tertinggi ${formatRupiahShort(maxDay === 1 ? 0 : maxDay)}`}
                </span>
              </div>
              <div className="flex h-32 items-end gap-[2px] border-b border-border" onMouseLeave={() => setHover(null)}>
                {daily.map((x) => (
                  <button
                    key={x.d}
                    onMouseEnter={() => setHover(x.d)}
                    onClick={() => setHover(hover === x.d ? null : x.d)}
                    className="group flex h-full flex-1 items-end"
                    aria-label={`${x.d}: ${formatRupiah(x.v)}`}
                  >
                    <span
                      className={`w-full rounded-t-[4px] transition-opacity ${hover && hover !== x.d ? "opacity-40" : ""}`}
                      style={{ height: `${x.v ? Math.max(4, (x.v / maxDay) * 100) : 0}%`, background: "var(--accent)" }}
                    />
                  </button>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-text-4">
                <span>1</span>
                <span>{Math.ceil(dim / 2)}</span>
                <span>{dim}</span>
              </div>
            </section>

            <section className="surface p-4">
              <h2 className="mb-3 text-[15px] font-bold text-text-1">Per kategori</h2>
              <div className="space-y-3">
                {byCat.map(([cat, v]) => {
                  const before = prevByCat.get(cat) ?? 0;
                  const diff = before > 0 ? Math.round(((v - before) / before) * 100) : null;
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-baseline justify-between text-[13px]">
                        <span className="font-semibold text-text-1">{cat}</span>
                        <span className="text-text-3">
                          <span className="font-mono font-semibold text-text-1">{formatRupiahShort(v)}</span>
                          {" · "}
                          {Math.round((v / Math.max(1, s.out)) * 100)}%
                          {diff != null && Math.abs(diff) >= 10 && (
                            <span className="ml-1">{diff > 0 ? `▲${diff}%` : `▼${-diff}%`}</span>
                          )}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-bg-elev2">
                        <div className="h-full rounded-full" style={{ width: `${(v / maxCat) * 100}%`, background: "var(--accent)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {byWho.length > 1 && (
              <section className="surface p-4">
                <h2 className="mb-3 text-[15px] font-bold text-text-1">Siapa yang keluar uang</h2>
                {byWho.map(([who, v]) => (
                  <div key={who} className="mb-2 flex items-center gap-3 text-[13px]">
                    <span className="w-24 truncate font-semibold text-text-1">{who}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-elev2">
                      <div className="h-full rounded-full" style={{ width: `${(v / Math.max(1, s.out)) * 100}%`, background: "var(--accent)" }} />
                    </div>
                    <span className="w-20 text-right font-mono text-text-2">{formatRupiahShort(v)}</span>
                  </div>
                ))}
              </section>
            )}

            {wallets.length > 0 && (
              <section className="surface p-4">
                <h2 className="mb-3 text-[15px] font-bold text-text-1">Per dompet</h2>
                {byWallet.map(([wid, v]) => {
                  const w = wallets.find((x) => x.id === wid);
                  return (
                    <div key={wid || "none"} className="mb-2 flex items-center justify-between text-[13px]">
                      <span className="text-text-2">{w ? `${w.emoji} ${w.name}` : "Tanpa dompet"}</span>
                      <span className="font-mono font-semibold text-text-1">{formatRupiah(v)}</span>
                    </div>
                  );
                })}
              </section>
            )}

            <section className="surface p-4">
              <h2 className="mb-2 text-[15px] font-bold text-text-1">5 pengeluaran terbesar</h2>
              {top.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-border py-2.5 text-[13px] last:border-0">
                  <span className="min-w-0 flex-1 truncate text-text-1">
                    {t.note || t.category}
                    <span className="ml-1.5 text-[11px] text-text-4">
                      {fromIsoDay(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · {t.who}
                    </span>
                  </span>
                  <span className="font-mono font-semibold text-text-1">{formatRupiah(t.amount)}</span>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, negative }: { label: string; value: string; sub: string; negative?: boolean }) {
  return (
    <div className="surface p-3.5">
      <div className="text-[12px] font-semibold text-text-3">{label}</div>
      <div className={`mt-0.5 font-mono text-[18px] font-extrabold tracking-tight ${negative ? "text-[color:var(--negative)]" : "text-text-1"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-text-4">{sub}</div>
    </div>
  );
}
