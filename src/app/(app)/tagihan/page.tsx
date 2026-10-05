"use client";

import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, Field, FieldGroup, Chips } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { WalletPicker, useWallets } from "@/components/wallet/Wallets";
import { useAuth } from "@/stores/auth";
import {
  addTransaction,
  deleteEntry,
  deleteItem,
  deleteTransaction,
  upsertEntry,
  upsertItem,
  useEntries,
  useItems,
} from "@/stores/data";
import { usePeople, parsePayload, fromIsoDay, isoDay } from "@/lib/people";
import { withWallet } from "@/lib/wallet";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";
import {
  BILL_PRESETS,
  DEFAULT_BILL,
  billState,
  dueLabel,
  paymentsOf,
  readBill,
  type BillPayload,
  type BillState,
  type BillType,
} from "@/lib/bills";
import type { ItemRecord } from "@/lib/db";

const TYPE_LABEL: Record<BillType, string> = { tagihan: "Tagihan", langganan: "Langganan", cicilan: "Cicilan" };
const EMOJIS = ["🧾", "⚡", "🚰", "🏠", "📶", "📱", "🏥", "🎬", "🎵", "☁️", "📲", "🛵", "🚗", "🎓", "💳", "🏦"];

export default function TagihanPage() {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const bills = useItems(userId, "bill") ?? [];
  const paid = useEntries(userId, "bill-paid") ?? [];
  const [editing, setEditing] = useState<ItemRecord | "new" | null>(null);

  const states = bills
    .filter((b) => b.status !== "archived")
    .map((b) => billState(b, paid))
    .sort((a, b) => Number(a.paid || a.finished) - Number(b.paid || b.finished) || a.daysLeft - b.daysLeft);
  const active = states.filter((s) => !s.finished);
  const perMonth = active.reduce((s, x) => s + (x.bill.amount ?? 0), 0);
  const unpaid = active.filter((s) => !s.paid);
  const unpaidSum = unpaid.reduce((s, x) => s + (x.bill.amount ?? 0), 0);
  const late = unpaid.filter((s) => s.daysLeft < 0).length;

  async function pay(s: BillState) {
    if (!userId) return;
    const tx = await addTransaction(userId, {
      kind: "out",
      amount: s.bill.amount ?? 0,
      category: s.p.category,
      who: me,
      note: s.p.type === "cicilan" && s.p.total ? `${s.bill.title} (${s.paidCount + 1}/${s.p.total})` : s.bill.title,
      date: isoDay(new Date()),
      tags: withWallet(["tagihan"], s.p.walletId ?? null),
    });
    await upsertEntry(userId, {
      kind: "bill-paid",
      date: tx.date,
      who: me,
      valueText: s.month,
      valueNum: tx.amount,
      payload: JSON.stringify({ billId: s.bill.id, txId: tx.id }),
    });
    hapticSuccess();
    if (s.p.type === "cicilan" && s.p.total && s.paidCount + 1 >= s.p.total) konfetti();
  }

  async function undo(s: BillState) {
    if (!userId) return;
    const entry = paymentsOf(s.bill.id, paid).find((e) => e.valueText === s.month);
    if (!entry) return;
    const txId = parsePayload(entry.payload, { txId: "" }).txId;
    if (txId) await deleteTransaction(userId, txId);
    await deleteEntry(userId, entry.id);
    hapticTap();
  }

  return (
    <div>
      <AppHeader
        title="Tagihan"
        actions={
          <button onClick={() => setEditing("new")} className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-bold text-accent-fg">
            + Tagihan
          </button>
        }
      />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="surface p-3.5">
            <div className="text-[12px] font-semibold text-text-3">Belum dibayar</div>
            <div className="mt-0.5 font-mono text-[18px] font-extrabold text-text-1">{formatRupiahShort(unpaidSum)}</div>
            <div className={`text-[11px] ${late ? "font-semibold text-[color:var(--negative)]" : "text-text-4"}`}>
              {late ? `${late} telat` : `${unpaid.length} tagihan`}
            </div>
          </div>
          <div className="surface p-3.5">
            <div className="text-[12px] font-semibold text-text-3">Per bulan</div>
            <div className="mt-0.5 font-mono text-[18px] font-extrabold text-text-1">{formatRupiahShort(perMonth)}</div>
            <div className="text-[11px] text-text-4">{active.length} rutin</div>
          </div>
        </div>

        {states.length === 0 ? (
          <div className="surface p-6 text-center">
            <div className="text-[40px]">🧾</div>
            <div className="mt-2 text-[17px] font-extrabold text-text-1">Tagihan rutin di satu tempat</div>
            <p className="mt-1 text-[13px] text-text-3">
              Listrik, kos, cicilan, langganan. Tinggal ketuk &ldquo;Bayar&rdquo; — langsung tercatat sebagai pengeluaran.
            </p>
            <button onClick={() => setEditing("new")} className="btn-accent mt-4 w-full">Tambah tagihan</button>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
            {states.map((s) => {
              const done = s.paid || s.finished;
              const tone = done ? "text-[color:var(--positive)]" : s.daysLeft < 0 ? "text-[color:var(--negative)]" : s.daysLeft <= 3 ? "text-[color:var(--warning)]" : "text-text-3";
              return (
                <li key={s.bill.id} className="border-b border-border last:border-0">
                  <SwipeRow onDelete={() => userId && deleteItem(userId, s.bill.id)}>
                    <div className="flex items-center gap-3 bg-bg-card px-4 py-3">
                      <button onClick={() => setEditing(s.bill)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bg-elev1 text-[22px]">{s.p.emoji}</span>
                        <span className="min-w-0">
                          <span className={`block truncate text-[15px] font-semibold ${done ? "text-text-3" : "text-text-1"}`}>{s.bill.title}</span>
                          <span className="block truncate text-[12px]">
                            <span className={`font-semibold ${tone}`}>{dueLabel(s)}</span>
                            <span className="text-text-4">
                              {" · "}
                              {fromIsoDay(s.due).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              {s.p.type === "cicilan" && s.p.total ? ` · ${Math.min(s.paidCount, s.p.total)}/${s.p.total}` : ""}
                            </span>
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-mono text-[13px] font-semibold text-text-1">{formatRupiahShort(s.bill.amount ?? 0)}</span>
                        {s.finished ? null : s.paid ? (
                          <button onClick={() => undo(s)} className="text-[11px] font-semibold text-text-4">Batalkan</button>
                        ) : (
                          <button onClick={() => pay(s)} className="rounded-full bg-accent px-3 py-1 text-[12px] font-bold text-accent-fg active:scale-95">
                            Bayar
                          </button>
                        )}
                      </div>
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
        )}
        {states.length > 0 && (
          <p className="px-1 text-center text-[12px] text-text-4">
            &ldquo;Bayar&rdquo; mencatat pengeluaran di Uang. Geser ke kiri untuk menghapus tagihan.
          </p>
        )}
      </div>

      {editing && userId && (
        <BillSheet userId={userId} me={me} bill={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function BillSheet({ userId, me, bill, onClose }: { userId: string; me: string; bill: ItemRecord | null; onClose: () => void }) {
  const p0 = bill ? readBill(bill) : DEFAULT_BILL;
  const [title, setTitle] = useState(bill?.title ?? "");
  const [amount, setAmount] = useState(bill?.amount ?? 0);
  const [p, setP] = useState<BillPayload>(p0);
  const set = (patch: Partial<BillPayload>) => setP({ ...p, ...patch });
  const { wallets } = useWallets();

  async function save() {
    if (!title.trim() || !amount) return;
    await upsertItem(userId, {
      ...(bill ?? {}),
      kind: "bill",
      title: title.trim(),
      amount,
      who: bill?.who ?? me,
      status: bill?.status ?? "on",
      payload: JSON.stringify({ ...p, total: p.type === "cicilan" ? p.total : undefined } satisfies BillPayload),
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      title={bill ? "Ubah tagihan" : "Tagihan baru"}
      onClose={onClose}
      footer={<button onClick={save} disabled={!title.trim() || !amount} className="btn-accent w-full disabled:opacity-50">Simpan</button>}
    >
      {!bill && (
        <FieldGroup label="Cepat pilih">
          <div className="flex flex-wrap gap-1.5">
            {BILL_PRESETS.map((x) => (
              <button
                key={x.title}
                onClick={() => {
                  setTitle(x.title);
                  setP({ ...p, emoji: x.emoji, type: x.type, category: x.category });
                }}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${title === x.title ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-2"}`}
              >
                {x.emoji} {x.title}
              </button>
            ))}
          </div>
        </FieldGroup>
      )}
      <Field label="Nama">
        <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Listrik rumah" />
      </Field>
      <Field label="Jumlah per bulan">
        <input
          className="input-base"
          inputMode="numeric"
          placeholder="Rp 0"
          value={amount ? formatRupiah(amount) : ""}
          onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
        />
      </Field>
      <FieldGroup label="Jenis">
        <Chips options={(Object.keys(TYPE_LABEL) as BillType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} value={p.type} onChange={(type) => set({ type })} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Jatuh tempo tiap tanggal">
          <input
            className="input-base"
            inputMode="numeric"
            value={p.day || ""}
            onChange={(e) => set({ day: Math.min(31, Number(e.target.value.replace(/\D/g, "")) || 0) })}
            placeholder="1–31"
          />
        </Field>
        {p.type === "cicilan" && (
          <Field label="Berapa kali bayar">
            <input
              className="input-base"
              inputMode="numeric"
              value={p.total || ""}
              onChange={(e) => set({ total: Number(e.target.value.replace(/\D/g, "")) || undefined })}
              placeholder="mis. 12"
            />
          </Field>
        )}
      </div>
      <FieldGroup label="Ikon">
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => set({ emoji: e })} className={`grid h-10 w-10 place-items-center rounded-xl text-[20px] ${p.emoji === e ? "bg-accent/10 ring-2 ring-accent" : "bg-bg-elev2"}`}>
              {e}
            </button>
          ))}
        </div>
      </FieldGroup>
      {wallets.length > 0 && (
        <FieldGroup label="Dibayar dari dompet">
          <WalletPicker value={p.walletId ?? null} onChange={(walletId) => set({ walletId })} />
        </FieldGroup>
      )}
    </Sheet>
  );
}
