"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, Field, Chips } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/stores/auth";
import { addTransaction, deleteEntry, upsertEntry, useEntries } from "@/stores/data";
import { usePeople, parsePayload, fromIsoDay } from "@/lib/people";
import { formatRupiah, todayISO } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import { splitBalance, type SplitMode, type SplitPayload } from "@/lib/split";

export default function PatunganPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const other = partner ?? "Pasangan";
  const splits = useEntries(userId, "split") ?? [];
  const settles = useEntries(userId, "split-settle") ?? [];
  const all = useMemo(
    () => [...splits, ...settles].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
    [splits, settles],
  );
  const net = splitBalance(all, me);
  const [adding, setAdding] = useState(false);
  const [settling, setSettling] = useState(false);

  return (
    <div>
      <AppHeader
        title="Patungan"
        actions={
          <button
            onClick={() => setAdding(true)}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
          >
            + Catat
          </button>
        }
      />
      <div className="space-y-4 px-5 pb-8 pt-3">
        <div
          className="rounded-[24px] p-5 text-white shadow-float"
          style={{ background: "linear-gradient(135deg,#f59e0b,#f97362)" }}
        >
          <div className="text-[13px] font-semibold text-white/85">Saldo kalian</div>
          {net === 0 ? (
            <div className="mt-1 text-[26px] font-extrabold">Impas 🎉</div>
          ) : (
            <>
              <div className="mt-1 text-[15px] font-semibold">
                {net > 0 ? `${other} perlu bayar ke kamu` : `Kamu perlu bayar ke ${other}`}
              </div>
              <div className="font-mono text-[34px] font-extrabold leading-tight">
                {formatRupiah(Math.abs(net))}
              </div>
            </>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setAdding(true)}
              className="flex-1 rounded-full bg-white py-2.5 text-[14px] font-bold text-[#d9620b] active:scale-[0.98]"
            >
              + Catat patungan
            </button>
            {net !== 0 && (
              <button
                onClick={() => setSettling(true)}
                className="rounded-full bg-white/20 px-4 py-2.5 text-[14px] font-semibold active:scale-[0.98]"
              >
                Lunasi
              </button>
            )}
          </div>
        </div>

        {all.length === 0 ? (
          <div className="rounded-[20px] border-2 border-dashed border-border px-6 py-10 text-center text-[13px] text-text-3">
            Bayarin makan, bensin, atau belanja buat berdua?
            <br />
            Catat di sini, nanti ketahuan siapa yang perlu ganti 🤝
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
            {all.map((e) => {
              const payer = e.who || me;
              const isSettle = e.kind === "split-settle";
              const p = parsePayload<SplitPayload>(e.payload, { note: "", mode: "half", owe: 0 });
              return (
                <li key={e.id} className="border-b border-border last:border-0">
                  <SwipeRow onDelete={() => userId && deleteEntry(userId, e.id)}>
                    <div className="flex items-center gap-3 bg-bg-card px-4 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-elev1 text-[17px]">
                        {isSettle ? "✅" : "🧾"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] text-text-1">
                          {isSettle
                            ? `${payer === me ? "Kamu" : payer} melunasi`
                            : p.note || "Patungan"}
                        </div>
                        <div className="text-[11px] text-text-4">
                          {fromIsoDay(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          {!isSettle &&
                            ` · ${payer === me ? "kamu" : payer} bayar ${formatRupiah(e.valueNum ?? 0)} · ${
                              p.mode === "half" ? "bagi dua" : p.mode === "full" ? `untuk ${payer === me ? other : "kamu"}` : "atur sendiri"
                            }`}
                        </div>
                      </div>
                      <div
                        className={`font-mono text-[14px] font-semibold ${
                          (payer === me) !== isSettle ? "text-[color:var(--positive)]" : "text-text-1"
                        }`}
                      >
                        {isSettle ? formatRupiah(e.valueNum ?? 0) : formatRupiah(p.owe)}
                      </div>
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {adding && userId && (
        <AddSplitSheet userId={userId} me={me} other={other} onClose={() => setAdding(false)} />
      )}
      {settling && userId && (
        <SettleSheet
          userId={userId}
          me={me}
          other={other}
          net={net}
          onClose={() => setSettling(false)}
        />
      )}
    </div>
  );
}

function AddSplitSheet({
  userId,
  me,
  other,
  onClose,
}: {
  userId: string;
  me: string;
  other: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState(me);
  const [mode, setMode] = useState<SplitMode>("half");
  const [custom, setCustom] = useState("");
  const [alsoExpense, setAlsoExpense] = useState(true);
  const num = Number(amount.replace(/\D/g, "")) || 0;
  const nonPayer = payer === me ? other : me;
  const owe = mode === "half" ? Math.round(num / 2) : mode === "full" ? num : Math.min(num, Number(custom.replace(/\D/g, "")) || 0);

  async function save() {
    if (num <= 0) return;
    const date = todayISO();
    await upsertEntry(userId, {
      kind: "split",
      date,
      who: payer,
      valueNum: num,
      valueText: note.trim(),
      payload: JSON.stringify({ note: note.trim(), mode, owe } satisfies SplitPayload),
    });
    if (alsoExpense) {
      await addTransaction(userId, {
        kind: "out",
        amount: num,
        category: "Lainnya",
        who: payer,
        note: note.trim() ? `${note.trim()} (patungan)` : "Patungan",
        date,
      });
    }
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      title="Catat patungan"
      onClose={onClose}
      footer={
        <button onClick={save} disabled={num <= 0} className="btn-accent w-full disabled:opacity-50">
          Simpan
        </button>
      }
    >
      <Field label="Total yang dibayar">
        <input
          className="input-base text-[20px] font-bold"
          inputMode="numeric"
          placeholder="Rp 0"
          autoFocus
          value={amount ? formatRupiah(num) : ""}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Untuk apa?">
        <input
          className="input-base"
          placeholder="Makan malam, bensin, tiket…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <Field label="Siapa yang bayar?">
        <Chips
          options={[
            { value: me, label: "Aku" },
            { value: other, label: other },
          ]}
          value={payer}
          onChange={setPayer}
        />
      </Field>
      <Field label="Dibagi bagaimana?">
        <Chips
          options={[
            { value: "half" as SplitMode, label: "Bagi dua" },
            { value: "full" as SplitMode, label: `Semua untuk ${nonPayer === me ? "aku" : nonPayer}` },
            { value: "custom" as SplitMode, label: "Atur sendiri" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Field>
      {mode === "custom" && (
        <Field label={`Bagian ${nonPayer === me ? "aku" : nonPayer}`}>
          <input
            className="input-base"
            inputMode="numeric"
            placeholder="Rp 0"
            value={custom ? formatRupiah(Number(custom.replace(/\D/g, "")) || 0) : ""}
            onChange={(e) => setCustom(e.target.value)}
          />
        </Field>
      )}
      {num > 0 && (
        <div className="mb-3 rounded-2xl bg-accent-soft px-4 py-3 text-[14px] text-text-1">
          {nonPayer === me ? "Kamu" : nonPayer} perlu ganti <b>{formatRupiah(owe)}</b> ke{" "}
          {payer === me ? "kamu" : payer}.
        </div>
      )}
      <label className="flex items-center gap-2 text-[13px] text-text-2">
        <input
          type="checkbox"
          checked={alsoExpense}
          onChange={(e) => setAlsoExpense(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--accent)]"
        />
        Catat juga sebagai pengeluaran di Uang
      </label>
    </Sheet>
  );
}

function SettleSheet({
  userId,
  me,
  other,
  net,
  onClose,
}: {
  userId: string;
  me: string;
  other: string;
  net: number;
  onClose: () => void;
}) {
  const debtor = net > 0 ? other : me;
  const [amount, setAmount] = useState(String(Math.abs(net)));
  const num = Number(amount.replace(/\D/g, "")) || 0;
  async function save() {
    if (num <= 0) return;
    await upsertEntry(userId, {
      kind: "split-settle",
      date: todayISO(),
      who: debtor,
      valueNum: num,
    });
    hapticSuccess();
    onClose();
  }
  return (
    <Sheet
      title="Lunasi"
      onClose={onClose}
      footer={
        <button onClick={save} disabled={num <= 0} className="btn-accent w-full disabled:opacity-50">
          Tandai lunas
        </button>
      }
    >
      <p className="mb-3 text-[14px] text-text-2">
        {debtor === me ? "Kamu" : debtor} membayar ke {debtor === me ? other : "kamu"}:
      </p>
      <input
        className="input-base text-[20px] font-bold"
        inputMode="numeric"
        value={formatRupiah(num)}
        onChange={(e) => setAmount(e.target.value)}
      />
      <p className="mt-2 text-[12px] text-text-4">Bisa diubah kalau baru bayar sebagian.</p>
    </Sheet>
  );
}
