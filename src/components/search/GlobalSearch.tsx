"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { FEATURES } from "@/data/features";
import { usePeople } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { readNote } from "@/lib/notes";
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
  const { me } = usePeople();
  const { nick } = useNick();

  const [q, setQ] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reduced = useReducedMotion();

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
          detail: "Catat pemasukan atau pengeluaran",
        },
        {
          href: "/moments",
          kind: "Aksi",
          label: "Tulis moment",
          detail: "Simpan cerita atau catatan berdua",
        },
        {
          href: "/settings/dashboard",
          kind: "Aksi",
          label: "Susun Beranda",
          detail: "Pilih dan atur kartu di Beranda",
        },
        {
          href: "/settings/workspace",
          kind: "Aksi",
          label: "Undang pasangan",
          detail: "Kirim link untuk pakai berdua",
        },
        {
          href: "/settings/theme",
          kind: "Aksi",
          label: "Ganti tema",
          detail: "Terang, gelap, dan warna",
        },
      );
      return out;
    }

    if (money) {
      out.push(
        {
          href: "/tracker",
          kind: "Catat cepat",
          label: `Catat pengeluaran ${formatRupiah(money)}`,
          detail: "Kategori Lainnya · hari ini",
          action: async () => {
            if (!userId) return;
            await addTransaction(userId, {
              kind: "out",
              amount: money,
              category: "Lainnya",
              who: me,
              note: needle,
              date: todayISO(),
            });
            setActionMsg("Pengeluaran tersimpan");
          },
        },
        {
          href: "/tracker",
          kind: "Catat cepat",
          label: `Catat pemasukan ${formatRupiah(money)}`,
          detail: "Kategori Lainnya · hari ini",
          action: async () => {
            if (!userId) return;
            await addTransaction(userId, {
              kind: "in",
              amount: money,
              category: "Lainnya",
              who: me,
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
        kind: "Catat cepat",
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
        kind: "Catat cepat",
        label: `Buat moment: ${text.slice(0, 40)}`,
        detail: "Simpan sebagai moment",
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
        kind: "Catat cepat",
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
        label: "Simpan ulang sekarang",
        detail: "Kirim catatan yang belum tersimpan",
        action: async () => {
          await sync.drain();
          setActionMsg("Sedang disimpan…");
        },
      });
    }
    // Spaces: typing "zakat" or "fokus" opens the space.
    for (const f of FEATURES) {
      if (`${f.title} ${f.subtitle} ${f.href.slice(1)}`.toLowerCase().includes(needle)) {
        out.push({ href: f.href, kind: "Ruang", label: f.title, detail: f.subtitle });
      }
    }
    // Catatan: title and the text inside the page.
    for (const n of (items ?? []).filter((x) => x.kind === "note")) {
      const note = readNote(n);
      const body = note.blocks.map((b) => b.text).join(" ");
      if (`${n.title} ${body}`.toLowerCase().includes(needle)) {
        const at = body.toLowerCase().indexOf(needle);
        out.push({
          href: `/catatan?id=${n.id}`,
          kind: "Catatan",
          label: n.title || "Tanpa judul",
          detail: at >= 0 ? body.slice(Math.max(0, at - 20), at + 50).trim() : undefined,
        });
      }
    }
    for (const t of txs ?? []) {
      const hay = `${t.category} ${t.note ?? ""} ${t.who}`.toLowerCase();
      if (hay.includes(needle)) {
        out.push({
          href: "/tracker",
          kind: "Transaksi",
          label: `${t.category} · ${formatRupiah(t.amount)}`,
          detail: `${formatDateShort(t.date)} · ${nick(t.who)}${
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
          label: `BAB ${c.number} · ${c.title}`,
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
      target: "/target",
      challenge: "/tantangan",
      khatam: "/tilawah",
      wallet: "/dompet",
      "wed-task": "/nikah",
      "wed-budget": "/nikah",
      "wed-seserahan": "/nikah",
      "wed-guest": "/nikah",
      "wed-pranikah": "/nikah",
      "wed-talk": "/nikah",
      habit: "/habits",
      class: "/jadwal",
      subscription: "/uang",
      payday: "/uang",
      closing: "/uang",
    };
    const KIND_LABEL: Record<string, string> = {
      target: "Target",
      challenge: "Tantangan",
      khatam: "Tilawah",
      wallet: "Dompet",
      wishlist: "Wishlist",
      gift: "Ide kado",
      anniv: "Tanggal penting",
      datenight: "Date night",
      bucket: "Bucket list",
      book: "Buku",
      course: "Kursus",
      shopping: "Belanja",
      debt: "Hutang",
      subscription: "Langganan",
      "wed-task": "Nikah",
      "wed-budget": "Nikah",
      "wed-seserahan": "Seserahan",
      "wed-guest": "Tamu",
      "wed-pranikah": "Pranikah",
      "wed-talk": "Pranikah",
    };
    // Internal rows (attachments, settings) never show up in search.
    const SKIP = new Set(["note", "note-file", "nickname", "tile-icon", "status", "class", "wed-meta"]);
    for (const it of items ?? []) {
      if (SKIP.has(it.kind)) continue;
      const hay = `${it.title} ${it.who ?? ""} ${(it.tags ?? []).join(" ")} ${(it.payload ?? "").slice(0, 400)}`.toLowerCase();
      if (hay.includes(needle)) {
        out.push({
          href: ITEM_HREF[it.kind] ?? "/home",
          kind: KIND_LABEL[it.kind] ?? it.kind,
          label: it.title,
          detail: it.date ? formatDateShort(it.date) : (it.status ?? undefined),
        });
      }
    }
    // Entries: journal text, exercise note, etc.
    for (const e of entries ?? []) {
      const hay = `${e.kind} ${e.valueText ?? ""} ${e.who ?? ""} ${(e.tags ?? []).join(" ")}`.toLowerCase();
      if (e.valueText && hay.includes(needle)) {
        const ENTRY: Record<string, [string, string]> = {
          ping: ["/kabar", "Kabar"],
          journal: ["/reflection", "Jurnal"],
          fokus: ["/fokus", "Fokus"],
          "review-q": ["/target", "Review"],
        };
        out.push({
          href: ENTRY[e.kind]?.[0] ?? "/home",
          kind: ENTRY[e.kind]?.[1] ?? e.kind,
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
            detail: `${c.day} ${c.start}-${c.end} · ${it.who ?? ""}`,
          });
        }
      } catch {
        // ignore
      }
    }
    return out.slice(0, 50);
  }, [q, userId, txs, goals, moments, chapters, items, entries, me, nick]);

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

  if (typeof document === "undefined") return null;
  // Portal to <body> so sticky headers or transforms never clip or trap it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[10vh]">
          <motion.div
            className="fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.05 : 0.18 }}
          >
            <button
              type="button"
              aria-label="Tutup pencarian"
              onClick={onClose}
              className="h-full w-full bg-black/55"
            />
          </motion.div>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.06 } }
                : { opacity: 0, y: -8, transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] } }
            }
            transition={reduced ? { duration: 0.08 } : { type: "spring", stiffness: 460, damping: 34 }}
            className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[20px] bg-bg-app shadow-float theme-transition"
          >
            <div className="flex items-center border-b border-border pr-1.5">
              <label htmlFor="global-search-input" className="sr-only">
                Cari atau perintah cepat
              </label>
              <input
                id="global-search-input"
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari atau ketik nominal, note..., moment..."
                className="min-h-[48px] flex-1 rounded-tl-[20px] bg-transparent px-4 py-3 text-sm text-text-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)]"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pencarian"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-3 hover:bg-bg-elev1"
              >
                <span aria-hidden className="text-lg leading-none">×</span>
              </button>
            </div>
            {actionMsg && (
              <div className="border-b border-border px-4 py-2 text-[12px] font-semibold text-[color:var(--positive)]">
                {actionMsg}
              </div>
            )}
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
                      className="block min-h-[44px] px-4 py-2.5 active:bg-bg-elev2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-text-1">
                          {h.label}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold text-text-3">
                          {h.kind}
                        </span>
                      </div>
                      {h.detail && (
                        <div className="truncate text-[12px] text-text-3">
                          {h.detail}
                        </div>
                      )}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
