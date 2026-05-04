"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { addTransaction } from "@/stores/data";
import { WidgetShell } from "./WidgetShell";
import { todayISO } from "@/lib/utils";

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

export function QuickAddWidget() {
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
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);

  async function submit() {
    if (!userId) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    setBusy(true);
    try {
      await addTransaction(userId, {
        kind,
        amount: num,
        category,
        who,
        date: todayISO(),
      });
      setAmount("");
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } finally {
      setBusy(false);
    }
  }

  return (
    <WidgetShell title="Tambah cepat">
      <div className="mb-2 flex gap-4 text-xs">
        {(["out", "in"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`-mb-px border-b pb-1.5 font-medium transition-colors ${
              kind === k
                ? "border-text-1 text-text-1"
                : "border-transparent text-text-4"
            }`}
          >
            {k === "out" ? "Keluar" : "Masuk"}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <input
          className={`input-base font-mono text-lg font-semibold ${
            pulse ? "ring-2 ring-[color:var(--positive)]" : ""
          }`}
          inputMode="numeric"
          placeholder="Rp 0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className="input-base h-10 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="input-base h-10 text-sm"
            value={who}
            onChange={(e) => setWho(e.target.value)}
          >
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={busy || !amount}
          className="btn-accent w-full text-sm disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan transaksi"}
        </button>
      </div>
    </WidgetShell>
  );
}
