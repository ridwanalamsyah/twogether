"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, ChevronRight, Download, Eye, EyeOff, Plus } from "lucide-react";
import { AppHeader } from "@/components/shell/AppHeader";
import { TransferSheet, WalletSheet, useWallets } from "@/components/wallet/Wallets";
import { WalletBadge, walletLook } from "@/components/wallet/WalletBadge";
import { IconTile } from "@/lib/icons";
import { upsertItem } from "@/stores/data";
import { formatRupiah } from "@/lib/utils";
import { parsePayload, fromIsoDay } from "@/lib/people";
import type { Wallet, TransferPayload } from "@/lib/wallet";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

const SUGGEST: [string, string][] = [
  ["BCA", "Rekening utama"],
  ["Mandiri", "Tabungan"],
  ["GoPay", "Kebutuhan harian"],
  ["DANA", "Kebutuhan harian"],
  ["ShopeePay", "Belanja online"],
  ["Tunai", "Pegangan harian"],
];
const HIDE_KEY = "twogether:hide-balance";

export default function DompetPage() {
  const { userId, wallets, balances, transfers } = useWallets();
  const [edit, setEdit] = useState<Wallet | "new" | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [hidden, setHidden] = useState(false);
  const total = wallets.reduce((s, w) => s + (balances[w.id] ?? 0), 0);
  const byId = (id: string) => wallets.find((w) => w.id === id);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  function toggleHidden() {
    hapticTap();
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !h;
    });
  }
  const money = (n: number) => (hidden ? "Rp •••••••" : formatRupiah(n));

  async function quickAdd(title: string, note: string) {
    if (!userId) return;
    await upsertItem(userId, { kind: "wallet", title, status: "on", payload: JSON.stringify({ emoji: "👛", initial: 0, note }) });
    hapticSuccess();
  }

  return (
    <div className="min-h-full pb-10">
      <AppHeader
        title="Dompet"
        actions={
          <button
            onClick={toggleHidden}
            aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-3 hover:bg-bg-elev2"
          >
            {hidden ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
          </button>
        }
      />
      <div className="px-5 pb-5 pt-1">
        <div className="text-[13px] font-medium text-text-3">Total saldo semua akun</div>
        <div className="num-hero mt-1 text-[36px] text-text-1">{money(total)}</div>
      </div>

      {wallets.length > 0 && (
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
          {wallets.map((w) => {
            const look = walletLook(w.name);
            return (
              <button
                key={w.id}
                onClick={() => setEdit(w)}
                className="relative flex aspect-[1.65] w-[78%] max-w-[340px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[24px] p-5 text-left text-white shadow-float active:scale-[0.99]"
                style={{ background: `linear-gradient(140deg, ${look.bg}, ${look.bg2})` }}
              >
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
                <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-8 h-44 w-44 rounded-full bg-black/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="truncate text-[17px] font-semibold">{w.name}</span>
                  <span className="rounded-full ring-2 ring-white/25">
                    <WalletBadge name={w.name} size={42} />
                  </span>
                </div>
                <div className="relative">
                  <div className="text-[12px] text-white/75">{w.note || "Saldo"}</div>
                  <div className="num mt-0.5 text-[22px] font-semibold tracking-tight">{money(balances[w.id] ?? 0)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3 px-4 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setTransfer(true)}
            disabled={wallets.length < 2}
            className="surface flex min-w-0 items-center gap-2 p-3 text-left disabled:opacity-50"
          >
            <IconTile spec={{ Icon: ArrowLeftRight, tint: "#94a3b8" }} size={36} radius={11} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-text-1">Transfer</span>
              <span className="block truncate text-[12px] text-text-3">Pindah saldo</span>
            </span>
          </button>
          <button onClick={() => setEdit("new")} className="surface flex min-w-0 items-center gap-2 p-3 text-left">
            <IconTile spec={{ Icon: Plus, tint: "#22c55e" }} size={36} radius={11} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-text-1">Akun baru</span>
              <span className="block truncate text-[12px] text-text-3">Tambah dompet</span>
            </span>
          </button>
        </div>

        {wallets.length === 0 ? (
          <section className="surface p-4">
            <div className="text-[16px] font-semibold text-text-1">Mulai dari rekening yang kalian pakai</div>
            <p className="mb-3 mt-0.5 text-[13px] text-text-3">Ketuk untuk menambah. Saldo awalnya bisa diisi setelahnya.</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGEST.map(([t, note]) => (
                <button key={t} onClick={() => quickAdd(t, note)} className="flex items-center gap-2.5 rounded-2xl bg-bg-elev1 p-2.5 text-left active:scale-[0.98]">
                  <WalletBadge name={t} size={34} />
                  <span className="text-[14px] font-semibold text-text-1">{t}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="flex items-baseline justify-between px-1 pb-2 pt-3">
              <h2 className="text-[18px] font-semibold text-text-1">Daftar akun & rekening</h2>
              <span className="text-[13px] text-text-3">{wallets.length} akun</span>
            </div>
            <ul className="space-y-2">
              {wallets.map((w) => (
                <li key={w.id}>
                  <button onClick={() => setEdit(w)} className="surface flex w-full items-center gap-3 px-3.5 py-3 text-left active:scale-[0.99]">
                    <WalletBadge name={w.name} size={44} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-text-1">{w.name}</span>
                    <span className="text-right">
                      <span className={`num block text-[15px] font-semibold ${(balances[w.id] ?? 0) < 0 ? "text-[color:var(--negative)]" : "text-text-1"}`}>
                        {money(balances[w.id] ?? 0)}
                      </span>
                      {w.note && <span className="block text-[12px] text-text-3">{w.note}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {transfers.length > 0 && (
          <section>
            <h2 className="px-1 pb-2 pt-3 text-[18px] font-semibold text-text-1">Pindah saldo terakhir</h2>
            <ul className="space-y-2">
              {[...transfers]
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 8)
                .map((t) => {
                  const p = parsePayload<TransferPayload>(t.payload, { from: "", to: "" });
                  const from = byId(p.from);
                  const to = byId(p.to);
                  return (
                    <li key={t.id} className="surface flex items-center gap-3 px-3.5 py-3">
                      <span className="flex -space-x-2">
                        <WalletBadge name={from?.name ?? "?"} size={30} />
                        <WalletBadge name={to?.name ?? "?"} size={30} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-text-1">
                          {from?.name ?? "?"} → {to?.name ?? "?"}
                        </span>
                        <span className="block text-[12px] text-text-3">
                          {fromIsoDay(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="num text-[14px] font-semibold text-text-1">{money(t.valueNum ?? 0)}</span>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        <Link href="/impor" className="surface flex items-center gap-3 p-3">
          <IconTile spec={{ Icon: Download, tint: "#64748b" }} size={40} radius={12} />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-text-1">Impor mutasi rekening</span>
            <span className="block text-[12px] text-text-3">Masukkan file CSV dari m-banking</span>
          </span>
          <ChevronRight size={16} className="text-text-4" />
        </Link>
      </div>
      {edit && <WalletSheet wallet={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {transfer && <TransferSheet onClose={() => setTransfer(false)} />}
    </div>
  );
}
