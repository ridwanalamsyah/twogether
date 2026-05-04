"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import {
  useGoals,
  useMoments,
  useSkripsiChapters,
  useTransactions,
} from "@/stores/data";
import { formatRupiah, formatDateShort } from "@/lib/utils";

interface Hit {
  href: string;
  kind: string;
  label: string;
  detail?: string;
}

/**
 * Spotlight-style global search. Indexes transaksi, goal, konten, moment, BAB
 * skripsi and returns ranked matches by simple substring scoring. Kept in
 * memory — no external search lib, no network.
 */
export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId) ?? [];
  const goals = useGoals(userId) ?? [];
  const moments = useMoments(userId) ?? [];
  const chapters = useSkripsiChapters(userId) ?? [];

  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: Hit[] = [];
    for (const t of txs) {
      const hay = `${t.category} ${t.note ?? ""} ${t.who}`.toLowerCase();
      if (hay.includes(needle)) {
        out.push({
          href: "/tracker",
          kind: "Transaksi",
          label: `${t.category} · ${formatRupiah(t.amount)}`,
          detail: `${formatDateShort(t.date)} · ${t.who}${
            t.note ? ` · ${t.note}` : ""
          }`,
        });
      }
    }
    for (const g of goals) {
      if (g.name.toLowerCase().includes(needle)) {
        out.push({
          href: "/goals",
          kind: "Goal",
          label: g.name,
          detail: formatRupiah(g.target),
        });
      }
    }
    for (const m of moments) {
      if (m.title.toLowerCase().includes(needle)) {
        out.push({
          href: "/moments",
          kind: "Moment",
          label: m.title,
          detail: formatDateShort(m.date),
        });
      }
    }
    for (const c of chapters) {
      if (
        c.title.toLowerCase().includes(needle) ||
        c.number.toLowerCase().includes(needle)
      ) {
        out.push({
          href: "/skripsi",
          kind: "Skripsi",
          label: `BAB ${c.number} — ${c.title}`,
          detail: c.status,
        });
      }
    }
    return out.slice(0, 30);
  }, [q, txs, goals, moments, chapters]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-[480px] overflow-hidden rounded-lg bg-bg-app shadow-2xl theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari transaksi, goal, moment, BAB skripsi…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
          {hits.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-text-4">
              {q ? "Tidak ada hasil" : "Ketik untuk mencari"}
            </li>
          ) : (
            hits.map((h, i) => (
              <li key={i}>
                <Link
                  href={h.href}
                  onClick={onClose}
                  className="block px-4 py-2.5 active:bg-bg-elev2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-text-1">
                      {h.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">
                      {h.kind}
                    </span>
                  </div>
                  {h.detail && (
                    <div className="truncate text-[11px] text-text-3">
                      {h.detail}
                    </div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
