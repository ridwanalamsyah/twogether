"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import {
  addTransaction,
  deleteTransaction,
  useTransactions,
  useTrips,
} from "@/stores/data";
import {
  formatRupiah,
  formatDateShort,
  todayISO,
} from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";

const CATEGORIES = [
  "Makan",
  "Bensin",
  "Laundry",
  "Skincare",
  "Kuliah",
  "Usaha",
  "Ortu",
  "Tabungan",
  "Jajan",
  "Lainnya",
];

export default function TrackerPage() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return (txs ?? [])
      .filter((t) => (filter === "all" ? true : t.kind === filter))
      .filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.note?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.who.toLowerCase().includes(q)
        );
      });
  }, [txs, filter, search]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Tracker"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg"
          >
            Tambah
          </button>
        }
      />
      <div className="px-5 pt-4">
        <input
          className="input-base h-10"
          placeholder="Cari…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-3 flex gap-4 border-b border-border text-xs">
          {(["all", "out", "in"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`-mb-px border-b pb-2 font-medium transition-colors ${
                filter === f
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-4"
              }`}
            >
              {f === "all" ? "Semua" : f === "out" ? "Keluar" : "Masuk"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-2 pb-6">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-3">
            Belum ada transaksi.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li
                key={t.id}
                className="group flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] text-text-1">
                    {t.note || t.category}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-4">
                    <span>
                      {t.who} · {formatDateShort(t.date)} · {t.category}
                    </span>
                    {(t.tags ?? []).map((tag) => (
                      <span key={tag} className="text-text-3">#{tag}</span>
                    ))}
                  </div>
                </div>
                <div
                  className={`font-mono text-[14px] font-medium tabular-nums ${
                    t.kind === "in"
                      ? "text-[color:var(--positive)]"
                      : "text-text-1"
                  }`}
                >
                  {t.kind === "in" ? "+" : "−"}{formatRupiah(t.amount)}
                </div>
                <button
                  onClick={() => userId && deleteTransaction(userId, t.id)}
                  className="text-text-5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[color:var(--negative)]"
                  aria-label="Hapus"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && <AddTxSheet onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddTxSheet({ onClose }: { onClose: () => void }) {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const people = useMemo(
    () =>
      members.length === 0
        ? ["Saya"]
        : members.length >= 2
          ? [...members.map((m) => m.name), sharedLabel]
          : members.map((m) => m.name),
    [members, sharedLabel],
  );
  const [kind, setKind] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [who, setWho] = useState(people[0]);
  useEffect(() => {
    if (!people.includes(who)) setWho(people[0]);
  }, [people, who]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tags, setTags] = useState<string[]>([]);
  const trips = useTrips(userId) ?? [];
  const tagSuggestions = useMemo(
    () => [...trips.map((t) => t.tag), "jajan", "kerja", "darurat", "hadiah"],
    [trips],
  );

  async function submit() {
    if (!userId) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    await addTransaction(userId, {
      kind,
      amount: num,
      category,
      who,
      note: note.trim() || undefined,
      date,
      tags: tags.length > 0 ? tags : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40">
      <div className="mx-auto w-full max-w-[480px] rounded-t-[20px] bg-bg-app p-5 pb-[calc(20px+var(--sab))] slide-up theme-transition">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tambah transaksi</h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>

        <div className="mb-3 flex gap-5 border-b border-border text-sm">
          {(["out", "in"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`-mb-px border-b pb-2 font-medium transition-colors ${
                kind === k
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-4"
              }`}
            >
              {k === "out" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <input
            className="input-base font-mono text-lg"
            inputMode="numeric"
            placeholder="Rp 0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input-base text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className="input-base text-sm"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <input
            className="input-base text-sm"
            placeholder="Catatan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <input
            type="date"
            className="input-base text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={tagSuggestions}
            placeholder="Tag (opsional, mis. trip:bali)…"
          />
          <button onClick={submit} className="btn-accent w-full text-sm">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
