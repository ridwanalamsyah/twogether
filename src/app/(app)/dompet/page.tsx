"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { TransferSheet, WalletSheet, useWallets } from "@/components/wallet/Wallets";
import { upsertItem } from "@/stores/data";
import { formatRupiah } from "@/lib/utils";
import { parsePayload, fromIsoDay } from "@/lib/people";
import type { Wallet, TransferPayload } from "@/lib/wallet";
import { hapticSuccess } from "@/lib/haptic";

const SUGGEST: [string, string][] = [
  ["Tunai", "💵"],
  ["BCA", "🏦"],
  ["GoPay", "📱"],
  ["ShopeePay", "📱"],
  ["DANA", "📱"],
  ["Tabungan", "🐷"],
];

export default function DompetPage() {
  const { userId, wallets, balances, transfers } = useWallets();
  const [edit, setEdit] = useState<Wallet | "new" | null>(null);
  const [transfer, setTransfer] = useState(false);
  const total = wallets.reduce((s, w) => s + (balances[w.id] ?? 0), 0);
  const name = (id: string) => wallets.find((w) => w.id === id);

  async function quickAdd(title: string, emoji: string) {
    if (!userId) return;
    await upsertItem(userId, { kind: "wallet", title, status: "on", payload: JSON.stringify({ emoji, initial: 0 }) });
    hapticSuccess();
  }

  return (
    <div>
      <AppHeader
        title="Dompet"
        actions={
          <button onClick={() => setEdit("new")} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg">
            + Dompet
          </button>
        }
      />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div className="rounded-[24px] p-5 text-white shadow-float" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <div className="text-[13px] font-semibold text-white/85">Total saldo</div>
          <div className="font-mono text-[34px] font-extrabold leading-tight">{formatRupiah(total)}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setTransfer(true)} disabled={wallets.length < 2} className="flex-1 rounded-full bg-white py-2.5 text-[14px] font-bold text-text-1 disabled:opacity-60">
              ⇄ Pindah saldo
            </button>
            <Link href="/impor" className="flex-1 rounded-full bg-white/20 py-2.5 text-center text-[14px] font-bold">
              Impor mutasi
            </Link>
          </div>
        </div>

        {wallets.length === 0 ? (
          <div className="surface p-5">
            <div className="text-[15px] font-bold text-text-1">Tambah dompet kalian</div>
            <p className="mb-3 text-[13px] text-text-3">Pisahkan saldo per rekening & e-wallet. Tap untuk menambah:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGEST.map(([t, e]) => (
                <button key={t} onClick={() => quickAdd(t, e)} className="rounded-full bg-bg-elev1 px-3 py-2 text-[13px] font-semibold text-text-1 active:scale-95">
                  {e} {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
            {wallets.map((w) => (
              <li key={w.id} className="border-b border-border last:border-0">
                <button onClick={() => setEdit(w)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-bg-elev1">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-bg-elev1 text-[22px]">{w.emoji}</span>
                  <span className="flex-1 text-[15px] font-semibold text-text-1">{w.name}</span>
                  <span className={`font-mono text-[15px] font-bold ${(balances[w.id] ?? 0) < 0 ? "text-[color:var(--negative)]" : "text-text-1"}`}>
                    {formatRupiah(balances[w.id] ?? 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {transfers.length > 0 && (
          <div>
            <div className="mb-2 px-1 text-[15px] font-extrabold text-text-1">Pindah saldo terakhir</div>
            <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
              {[...transfers].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map((t) => {
                const p = parsePayload<TransferPayload>(t.payload, { from: "", to: "" });
                return (
                  <li key={t.id} className="flex items-center justify-between border-b border-border px-4 py-3 text-[13px] last:border-0">
                    <span className="text-text-2">
                      {name(p.from)?.emoji} {name(p.from)?.name ?? "?"} → {name(p.to)?.emoji} {name(p.to)?.name ?? "?"}
                      <span className="ml-1.5 text-text-4">{fromIsoDay(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </span>
                    <span className="font-mono font-semibold text-text-1">{formatRupiah(t.valueNum ?? 0)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="px-1 text-[12px] text-text-4">
          Saat mencatat transaksi, pilih dompetnya supaya saldo tiap dompet ikut terhitung.
        </p>
      </div>
      {edit && <WalletSheet wallet={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {transfer && <TransferSheet onClose={() => setTransfer(false)} />}
    </div>
  );
}
