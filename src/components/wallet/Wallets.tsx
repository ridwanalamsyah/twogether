"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet, Field, Chips } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { deleteItem, upsertEntry, upsertItem, useEntries, useItems, useTransactions } from "@/stores/data";
import { WALLET_EMOJIS, toWallet, walletBalances, type Wallet } from "@/lib/wallet";
import { formatRupiah, formatRupiahShort, todayISO } from "@/lib/utils";
import { usePeople } from "@/lib/people";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

export function useWallets() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "wallet") ?? [];
  const txs = useTransactions(userId) ?? [];
  const transfers = useEntries(userId, "wallet-transfer") ?? [];
  const wallets = items.map(toWallet).filter((w) => !w.archived).sort((a, b) => a.name.localeCompare(b.name));
  const balances = walletBalances(wallets, txs, transfers);
  return { userId, wallets, balances, items, transfers };
}

/** Horizontal wallet chooser used in add-transaction forms. */
export function WalletPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { wallets } = useWallets();
  if (wallets.length === 0) return null;
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
      {wallets.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => {
            onChange(value === w.id ? null : w.id);
            hapticTap();
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
            value === w.id ? "bg-accent text-accent-fg" : "bg-bg-card text-text-2 shadow-card"
          }`}
        >
          <span>{w.emoji}</span>
          {w.name}
        </button>
      ))}
    </div>
  );
}

/** Wallet cards with live balances (top of Uang). */
export function WalletStrip({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const { wallets, balances } = useWallets();
  const total = wallets.reduce((s, w) => s + (balances[w.id] ?? 0), 0);
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-[18px] px-4 py-3 text-left ${selected === null ? "bg-text-1 text-bg-app" : "bg-bg-card text-text-1 shadow-card"}`}
      >
        <div className={`text-[11px] font-semibold ${selected === null ? "opacity-70" : "text-text-3"}`}>Semua dompet</div>
        <div className="font-mono text-[16px] font-extrabold">{wallets.length ? formatRupiahShort(total) : "—"}</div>
      </button>
      {wallets.map((w) => (
        <button
          key={w.id}
          onClick={() => onSelect(selected === w.id ? null : w.id)}
          className={`shrink-0 rounded-[18px] px-4 py-3 text-left ${selected === w.id ? "bg-accent text-accent-fg" : "bg-bg-card text-text-1 shadow-card"}`}
        >
          <div className={`text-[11px] font-semibold ${selected === w.id ? "opacity-85" : "text-text-3"}`}>
            {w.emoji} {w.name}
          </div>
          <div className="font-mono text-[16px] font-extrabold">{formatRupiahShort(balances[w.id] ?? 0)}</div>
        </button>
      ))}
      <Link
        href="/dompet"
        className="grid shrink-0 place-items-center rounded-[18px] border-2 border-dashed border-border-strong px-4 text-[13px] font-semibold text-text-3"
      >
        {wallets.length ? "Atur" : "+ Dompet"}
      </Link>
    </div>
  );
}

export function WalletSheet({ wallet, onClose }: { wallet?: Wallet; onClose: () => void }) {
  const userId = useAuth((s) => s.userId);
  const [name, setName] = useState(wallet?.name ?? "");
  const [emoji, setEmoji] = useState(wallet?.emoji ?? "👛");
  const [initial, setInitial] = useState(wallet?.initial ? String(wallet.initial) : "");
  const n = Number(initial.replace(/[^\d-]/g, "")) || 0;
  async function save() {
    if (!userId || !name.trim()) return;
    await upsertItem(userId, {
      id: wallet?.id,
      kind: "wallet",
      title: name.trim(),
      status: "on",
      payload: JSON.stringify({ emoji, initial: n }),
    });
    hapticSuccess();
    onClose();
  }
  return (
    <Sheet
      title={wallet ? wallet.name : "Dompet baru"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {wallet && userId && (
            <button
              onClick={async () => {
                if (!confirm("Hapus dompet ini? Transaksinya tetap ada.")) return;
                await deleteItem(userId, wallet.id);
                onClose();
              }}
              className="btn-danger"
            >
              Hapus
            </button>
          )}
          <button onClick={save} disabled={!name.trim()} className="btn-accent flex-1 disabled:opacity-50">
            Simpan
          </button>
        </div>
      }
    >
      <Field label="Nama">
        <input className="input-base" autoFocus placeholder="BCA, GoPay, Tunai…" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Ikon">
        <div className="flex flex-wrap gap-1.5">
          {WALLET_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji(em)}
              className={`grid h-10 w-10 place-items-center rounded-xl text-[20px] ${emoji === em ? "bg-accent-soft ring-2 ring-[color:var(--accent)]" : "bg-bg-card shadow-card"}`}
            >
              {em}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Saldo awal (saldo saat ini sebelum dicatat di Twogether)">
        <input className="input-base" inputMode="numeric" placeholder="Rp 0" value={initial ? formatRupiah(n) : ""} onChange={(e) => setInitial(e.target.value)} />
      </Field>
    </Sheet>
  );
}

export function TransferSheet({ onClose }: { onClose: () => void }) {
  const { userId, wallets, balances } = useWallets();
  const { me } = usePeople();
  const [from, setFrom] = useState(wallets[0]?.id ?? "");
  const [to, setTo] = useState(wallets[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const n = Number(amount.replace(/\D/g, "")) || 0;
  const opts = wallets.map((w) => ({ value: w.id, label: `${w.emoji} ${w.name}` }));
  async function save() {
    if (!userId || !from || !to || from === to || n <= 0) return;
    await upsertEntry(userId, {
      kind: "wallet-transfer",
      date: todayISO(),
      who: me,
      valueNum: n,
      payload: JSON.stringify({ from, to }),
    });
    hapticSuccess();
    onClose();
  }
  return (
    <Sheet
      title="Pindah saldo"
      onClose={onClose}
      footer={
        <button onClick={save} disabled={!from || !to || from === to || n <= 0} className="btn-accent w-full disabled:opacity-50">
          Pindahkan
        </button>
      }
    >
      <Field label={`Dari (saldo ${formatRupiah(balances[from] ?? 0)})`}>
        <Chips options={opts} value={from} onChange={setFrom} />
      </Field>
      <Field label="Ke">
        <Chips options={opts.filter((o) => o.value !== from)} value={to} onChange={setTo} />
      </Field>
      <Field label="Jumlah">
        <input className="input-base text-[18px] font-bold" inputMode="numeric" placeholder="Rp 0" value={amount ? formatRupiah(n) : ""} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <p className="text-[12px] text-text-4">Misalnya tarik tunai dari BCA atau isi saldo GoPay. Tidak dihitung sebagai pengeluaran.</p>
    </Sheet>
  );
}
