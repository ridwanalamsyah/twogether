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
  formatRupiahShort,
  todayISO,
} from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";
import { SwipeRow } from "@/components/ui/SwipeRow";

const CATEGORY_EMOJI: Record<string, string> = {
  Makan: "🍜",
  Bensin: "⛽️",
  Laundry: "🧺",
  Skincare: "🧴",
  Kuliah: "🎓",
  Usaha: "💼",
  Ortu: "👪",
  Tabungan: "🏦",
  Jajan: "🧋",
  Lainnya: "🧾",
};

function dayLabel(iso: string): string {
  const today = todayISO();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (iso === today) return "Hari ini";
  if (iso === yesterday) return "Kemarin";
  const [yy, mm, dd] = iso.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

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

  const month = useMemo(() => {
    const prefix = todayISO().slice(0, 7);
    let inc = 0;
    let out = 0;
    for (const t of txs ?? []) {
      if (!t.date.startsWith(prefix)) continue;
      if (t.kind === "in") inc += t.amount;
      else out += t.amount;
    }
    return { inc, out, net: inc - out };
  }, [txs]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.date.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      total: items.reduce((sum, t) => sum + (t.kind === "in" ? t.amount : -t.amount), 0),
    }));
  }, [filtered]);

  return (
    <div>
      <AppHeader
        title="Uang"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg active:scale-95"
          >
            Tambah
          </button>
        }
      />
      <div className="px-5 pt-4">
        <div className="surface grid grid-cols-3 divide-x divide-border py-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-4">Masuk</div>
            <div className="mt-0.5 font-mono text-[14px] font-semibold text-[color:var(--positive)]">
              {formatRupiahShort(month.inc)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-4">Keluar</div>
            <div className="mt-0.5 font-mono text-[14px] font-semibold text-text-1">
              {formatRupiahShort(month.out)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-4">Sisa</div>
            <div
              className={`mt-0.5 font-mono text-[14px] font-semibold ${
                month.net < 0 ? "text-[color:var(--negative)]" : "text-text-1"
              }`}
            >
              {formatRupiahShort(month.net)}
            </div>
          </div>
        </div>
        <div className="mt-1.5 text-center text-[10px] text-text-4">Bulan ini</div>

        <div className="mt-3 flex items-center gap-2">
          <input
            className="input-base h-9 flex-1 bg-bg-elev1 text-[14px]"
            type="search"
            placeholder="Cari catatan, kategori, nama…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative mt-3 grid grid-cols-3 rounded-[10px] bg-bg-elev2 p-0.5 text-[12px]">
          <span
            aria-hidden
            className="absolute bottom-0.5 top-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-[8px] bg-bg-app shadow-sm transition-transform duration-300 ease-ios"
            style={{
              transform: `translateX(${["all", "out", "in"].indexOf(filter) * 100}%)`,
            }}
          />
          {(["all", "out", "in"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative py-1.5 font-medium transition-colors ${
                filter === f ? "text-text-1" : "text-text-3"
              }`}
            >
              {f === "all" ? "Semua" : f === "out" ? "Keluar" : "Masuk"}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 pb-6">
        {groups.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="text-3xl">🧾</div>
            <div className="mt-2 text-sm text-text-3">
              {search ? "Tidak ada yang cocok." : "Belum ada transaksi."}
            </div>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="btn-accent mt-4 px-5 py-2 text-[13px]"
              >
                Catat transaksi pertama
              </button>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.date} className="slide-up">
              <div className="flex items-baseline justify-between px-5 pb-1 pt-4">
                <span className="text-[12px] font-semibold text-text-2">
                  {dayLabel(g.date)}
                </span>
                <span className="font-mono text-[11px] text-text-4">
                  {g.total >= 0 ? "+" : "−"}
                  {formatRupiahShort(Math.abs(g.total))}
                </span>
              </div>
              <ul>
                {g.items.map((t) => (
                  <li key={t.id}>
                    <SwipeRow onDelete={() => userId && deleteTransaction(userId, t.id)}>
                      <div className="flex items-center gap-3 px-5 py-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-bg-elev2 text-[17px]">
                          {CATEGORY_EMOJI[t.category] ?? "🧾"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] text-text-1">
                            {t.note || t.category}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-text-4">
                            <span>
                              {t.who} · {t.category}
                            </span>
                            {(t.tags ?? []).map((tag) => (
                              <span key={tag} className="text-text-3">
                                #{tag}
                              </span>
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
                          {t.kind === "in" ? "+" : "−"}
                          {formatRupiah(t.amount)}
                        </div>
                      </div>
                    </SwipeRow>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {groups.length > 0 && (
          <p className="px-5 pt-4 text-center text-[11px] text-text-5">
            Geser ke kiri untuk menghapus
          </p>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-in">
      <div className="mx-auto w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(96px+var(--sab))] sheet-up theme-transition">
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
