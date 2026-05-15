"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import {
  addTransaction,
  useAllEntries,
  useAllItems,
  useGoals,
  useMoments,
  useSkripsiChapters,
  useTransactions,
  upsertEntry,
  upsertItem,
  upsertMoment,
} from "@/stores/data";

import { formatRupiah, formatDateShort, todayISO } from "@/lib/utils";
import { sync } from "@/services/sync";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

interface Hit {
  href: string;
  kind: string;
  label: string;
  detail?: string;
  action?: () => void | Promise<void>;
}

function parseMoney(q: string): number | null {
  const cleaned = q.replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
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
  const txs = useTransactions(userId);
  const goals = useGoals(userId);
  const moments = useMoments(userId);
  const chapters = useSkripsiChapters(userId);
  const items = useAllItems(userId);
  const entries = useAllEntries(userId);

  const [q, setQ] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    const out: Hit[] = [];
    const money = parseMoney(needle);
    if (!needle) {
      out.push(
        {
          href: "/tracker",
          kind: "Aksi",
          label: "Tambah transaksi",
          detail: "Catat pemasukan/pengeluaran cepat",
        },
        {
          href: "/moments",
          kind: "Aksi",
          label: "Tulis moment",
          detail: "Simpan cerita atau catatan pasangan",
        },
        {
          href: "/settings/dashboard",
          kind: "Aksi",
          label: "Atur dashboard",
          detail: "Tambah, resize, dan susun widget",
        },
        {
          href: "/settings/workspace",
          kind: "Aksi",
          label: "Invite partner",
          detail: "Bagikan workspace Twogether",
        },
        {
          href: "/settings/theme",
          kind: "Aksi",
          label: "Ganti tema",
          detail: "Light, dark, auto, dan aksen",
        },
      );
      return out;
    }

    if (money) {
      out.push(
        {
          href: "/tracker",
          kind: "Quick Add",
          label: `Catat pengeluaran ${formatRupiah(money)}`,
          detail: "Kategori Lainnya · hari ini",
          action: async () => {
            if (!userId) return;
            await addTransaction(userId, {
              kind: "out",
              amount: money,
              category: "Lainnya",
              who: "Saya",
              note: needle,
              date: todayISO(),
            });
            setActionMsg("Pengeluaran tersimpan");
          },
        },
        {
          href: "/tracker",
          kind: "Quick Add",
          label: `Catat pemasukan ${formatRupiah(money)}`,
          detail: "Kategori Lainnya · hari ini",
          action: async () => {
            if (!userId) return;
            await addTransaction(userId, {
              kind: "in",
              amount: money,
              category: "Lainnya",
              who: "Saya",
              note: needle,
              date: todayISO(),
            });
            setActionMsg("Pemasukan tersimpan");
          },
        },
      );
    }
    if (needle.startsWith("note ") || needle.startsWith("catat ")) {
      const text = q.trim().replace(/^(note|catat)\s+/i, "");
      out.push({
        href: "/reflection",
        kind: "Quick Add",
        label: `Simpan note: ${text.slice(0, 42)}`,
        detail: "Masuk journal hari ini",
        action: async () => {
          if (!userId || !text.trim()) return;
          await upsertEntry(userId, {
            kind: "journal",
            date: todayISO(),
            valueText: text.trim(),
          });
          setActionMsg("Note tersimpan");
        },
      });
    }
    if (needle.startsWith("moment ")) {
      const text = q.trim().replace(/^moment\s+/i, "");
      out.push({
        href: "/moments",
        kind: "Quick Add",
        label: `Buat moment: ${text.slice(0, 40)}`,
        detail: "Tersimpan offline-first",
        action: async () => {
          if (!userId || !text.trim()) return;
          await upsertMoment(userId, {
            title: text.trim().slice(0, 48),
            body: text.trim(),
            date: todayISO(),
            emoji: "💌",
          });
          setActionMsg("Moment tersimpan");
        },
      });
    }
    if (needle.startsWith("task ")) {
      const text = q.trim().replace(/^task\s+/i, "");
      out.push({
        href: "/list",
        kind: "Quick Add",
        label: `Buat task: ${text.slice(0, 42)}`,
        detail: "Masuk list sebagai task",
        action: async () => {
          if (!userId || !text.trim()) return;
          await upsertItem(userId, {
            kind: "task",
            title: text.trim(),
            status: "open",
            date: todayISO(),
          });
          setActionMsg("Task tersimpan");
        },
      });
    }
    if (needle.includes("sync")) {
      out.push({
        href: "/settings",
        kind: "Aksi",
        label: "Sync sekarang",
        detail: "Drain antrean offline ke backend",
        action: async () => {
          await sync.drain();
          setActionMsg("Sync dijalankan");
        },
      });
    }
    for (const t of txs ?? []) {
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
    for (const g of goals ?? []) {
      if (g.name.toLowerCase().includes(needle)) {
        out.push({
          href: "/goals",
          kind: "Goal",
          label: g.name,
          detail: formatRupiah(g.target),
        });
      }
    }
    for (const m of moments ?? []) {
      if (m.title.toLowerCase().includes(needle)) {
        out.push({
          href: "/moments",
          kind: "Moment",
          label: m.title,
          detail: formatDateShort(m.date),
        });
      }
    }
    for (const c of chapters ?? []) {
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
    // Items: wishlist, gift, book, course, langganan, hutang, etc.
    const ITEM_HREF: Record<string, string> = {
      wishlist: "/list",
      gift: "/list",
      media: "/list",
      ootd: "/list",
      skincare: "/list",
      resolution: "/list",
      dream: "/list",
      donation: "/list",
      anniv: "/kita",
      datenight: "/kita",
      bucket: "/kita",
      surprise: "/kita",
      qotd: "/kita",
      argument: "/kita",
      apresiasi: "/kita",
      book: "/belajar",
      course: "/belajar",
      shopping: "/rumah",
      pantry: "/rumah",
      cleaning: "/rumah",
      meal: "/rumah",
      maintenance: "/rumah",
      pet: "/rumah",
      debt: "/uang",
      subscription: "/uang",
      payday: "/uang",
      closing: "/uang",
    };
    for (const it of items ?? []) {
      const hay = `${it.title} ${it.who ?? ""} ${(it.tags ?? []).join(" ")} ${it.payload ?? ""}`.toLowerCase();
      if (hay.includes(needle)) {
        out.push({
          href: ITEM_HREF[it.kind] ?? "/home",
          kind: it.kind,
          label: it.title,
          detail: it.date ? formatDateShort(it.date) : (it.status ?? undefined),
        });
      }
    }
    // Entries: journal text, exercise note, etc.
    for (const e of entries ?? []) {
      const hay = `${e.kind} ${e.valueText ?? ""} ${e.who ?? ""} ${(e.tags ?? []).join(" ")}`.toLowerCase();
      if (e.valueText && hay.includes(needle)) {
        out.push({
          href: "/home",
          kind: e.kind,
          label: e.valueText.slice(0, 60),
          detail: formatDateShort(e.date),
        });
      }
    }
    // Class schedule (user-edited items kind="class")
    for (const it of items ?? []) {
      if (it.kind !== "class" || !it.payload) continue;
      try {
        const c = JSON.parse(it.payload) as {
          day: string;
          start: string;
          end: string;
          room?: string;
          pj?: string;
          cp?: string;
        };
        const hay = `${it.title} ${it.who ?? ""} ${c.day} ${c.pj ?? ""} ${c.room ?? ""}`.toLowerCase();
        if (hay.includes(needle)) {
          out.push({
            href: "/jadwal",
            kind: "Kuliah",
            label: it.title,
            detail: `${c.day} ${c.start}–${c.end} · ${it.who ?? ""}`,
          });
        }
      } catch {
        // ignore
      }
    }
    return out.slice(0, 50);
  }, [q, userId, txs, goals, moments, chapters, items, entries]);

  async function runAction(h: Hit) {
    if (!h.action) return;
    hapticTap();
    await h.action();
    hapticSuccess();
    setQ("");
    window.setTimeout(() => setActionMsg(null), 2200);
  }

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
        <div className="border-b border-border">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search or command: 25000, note..., moment..., task..."
            className="w-full bg-transparent px-4 py-3 text-sm outline-none"
          />
          {actionMsg && (
            <div className="px-4 pb-2 text-[11px] font-semibold text-[color:var(--positive)]">
              {actionMsg}
            </div>
          )}
        </div>
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
                  onClick={(e) => {
                    if (h.action) {
                      e.preventDefault();
                      void runAction(h);
                      return;
                    }
                    onClose();
                  }}
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
