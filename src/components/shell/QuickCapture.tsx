"use client";

import { useNick } from "@/lib/nick";
import { useEffect, useMemo, useRef, useState } from "react";
import { budgetAlert } from "@/lib/budget";
import { toast } from "@/lib/toast";
import {
  addTransaction,
  upsertEntry,
  upsertItem,
  upsertMoment,
} from "@/stores/data";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { hapticSuccess, hapticTap, hapticWarn } from "@/lib/haptic";
import { todayISO } from "@/lib/utils";
import { ReceiptScanButton } from "@/components/ui/ReceiptScan";
import { WalletPicker, useWallets } from "@/components/wallet/Wallets";
import { lastWallet, rememberWallet, withWallet } from "@/lib/wallet";
import { listenOnce, parseSpoken, voiceSupported } from "@/lib/voice";
import { guessCategory } from "@/lib/csvImport";
import type { CaptureAction } from "@/stores/ui";
import { Mic, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSheetDrag } from "@/components/ui/Sheet";

export type QuickCaptureMode = "transaction" | "moment" | "note" | "task";

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

export function QuickCapture({
  open,
  initialMode = "transaction",
  action = "manual",
  onClose,
}: {
  open: boolean;
  initialMode?: QuickCaptureMode;
  action?: CaptureAction;
  onClose: () => void;
}) {
  const { nick } = useNick();
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const people = useMemo(
    () =>
      members.length === 0
        ? ["Saya"]
        : members.length >= 2
          ? [...members.map((m) => m.name), sharedLabel]
          : members.map((m) => m.name),
    [members, sharedLabel],
  );

  const [mode, setMode] = useState<QuickCaptureMode>(initialMode);
  const [kind, setKind] = useState<"out" | "in">("out");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState<string | null>(() => lastWallet());
  const { wallets } = useWallets();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [who, setWho] = useState(people[0]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const stopListening = useRef<(() => void) | null>(null);

  function startVoice() {
    if (!voiceSupported()) {
      toast("Catat pakai suara belum didukung di HP ini. Ketik saja ya.");
      return;
    }
    setHeard(null);
    const { promise, stop } = listenOnce(() => setListening(true));
    stopListening.current = stop;
    promise
      .then((text) => {
        const s = parseSpoken(text);
        setHeard(text);
        setMode("transaction");
        setKind(s.kind);
        if (s.amount) setAmount(String(s.amount));
        if (s.note) {
          setTitle(s.note);
          const c = guessCategory(s.note);
          if (CATEGORIES.includes(c)) setCategory(c);
        }
        hapticSuccess();
      })
      .catch((e: Error) => {
        if (e.message === "not-allowed") toast("Izinkan mikrofon dulu di pengaturan HP.");
        else if (e.message !== "aborted") toast("Belum kedengaran. Coba lagi, agak dekat ke HP.");
      })
      .finally(() => setListening(false));
  }

  useEffect(() => {
    if (!open) return;
    setMode(action === "manual" ? initialMode : "transaction");
    if (action !== "manual") setKind("out");
    setSaved(null);
    setHeard(null);
    if (action === "voice") startVoice();
    else if (action === "manual") window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => stopListening.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode, action]);

  useEffect(() => {
    if (!people.includes(who)) setWho(people[0]);
  }, [people, who]);

  async function submit() {
    if (!userId || busy) return;
    setBusy(true);
    setSaved(null);
    try {
      if (mode === "transaction") {
        const num = Number(amount.replace(/\D/g, ""));
        if (!Number.isFinite(num) || num <= 0) {
          hapticWarn();
          return;
        }
        await addTransaction(userId, {
          kind,
          amount: num,
          category,
          who,
          note: title.trim() || undefined,
          date: todayISO(),
          // A remembered wallet may have been deleted since.
          tags: withWallet(undefined, wallets.some((w) => w.id === walletId) ? walletId : null),
        });
        void budgetAlert(userId, { kind, category, amount: num, date: todayISO() }).then((a) => a && toast(a.text, a.tone));
        setAmount("");
        setTitle("");
        setSaved("Transaksi tersimpan");
      } else if (mode === "moment") {
        const cleanTitle = title.trim() || body.trim().slice(0, 40);
        if (!cleanTitle) {
          hapticWarn();
          return;
        }
        await upsertMoment(userId, {
          title: cleanTitle,
          body: body.trim(),
          date: todayISO(),
          emoji: "💌",
        });
        setTitle("");
        setBody("");
        setSaved("Moment tersimpan");
      } else if (mode === "note") {
        const text = body.trim() || title.trim();
        if (!text) {
          hapticWarn();
          return;
        }
        await upsertEntry(userId, {
          kind: "journal",
          date: todayISO(),
          valueText: text,
          who,
        });
        setTitle("");
        setBody("");
        setSaved("Catatan tersimpan");
      } else {
        const cleanTitle = title.trim() || body.trim();
        if (!cleanTitle) {
          hapticWarn();
          return;
        }
        await upsertItem(userId, {
          kind: "task",
          title: cleanTitle,
          status: "open",
          date: todayISO(),
          who,
        });
        setTitle("");
        setBody("");
        setSaved("Tugas tersimpan");
      }
      hapticSuccess();
    } finally {
      setBusy(false);
    }
  }

  const drag = useSheetDrag(onClose);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.06 : 0.2 }}
          >
            <motion.button
              type="button"
              aria-label="Tutup panel catat"
              onClick={onClose}
              className="h-full w-full bg-black/45"
              {...drag.backdrop}
            />
          </motion.div>
          <motion.div
            className="relative z-10 mx-auto w-full max-w-[480px]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.08 } }
                : { opacity: 0, y: 28, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }
            }
            transition={reduced ? { duration: 0.08 } : { type: "spring", stiffness: 460, damping: 35 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Catat apa?"
              className="rounded-t-[24px] border-t border-border bg-bg-app p-5 pb-[calc(var(--sab)+20px)] shadow-float theme-transition md:rounded-[26px] md:border md:pb-6"
              {...drag.panel}
            >
              <div className="-mx-5 -mt-5 cursor-grab px-5 pt-5 active:cursor-grabbing" {...drag.handle}>
                <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-bg-elev3" />
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[17px] font-semibold text-text-1">
                      Catat apa?
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup"
                    className="-mr-1.5 grid h-11 w-11 place-items-center rounded-full text-text-3 transition-transform active:scale-90"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1">
                      <X size={16} aria-hidden />
                    </span>
                  </button>
                </div>
              </div>

              <div role="tablist" aria-label="Jenis catatan" className="mb-4 grid grid-cols-4 gap-1 rounded-full bg-bg-elev2 p-1 text-[12px] font-semibold">
                {[
                  ["transaction", "Uang"],
                  ["moment", "Moment"],
                  ["note", "Catatan"],
                  ["task", "Tugas"],
                ].map(([id, label]) => {
                  const active = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setMode(id as QuickCaptureMode);
                        hapticTap();
                      }}
                      className={`relative z-0 min-h-[44px] rounded-full py-2 transition-colors ${
                        active ? "text-bg-app" : "text-text-3"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="qc-mode"
                          aria-hidden
                          className="absolute inset-0 -z-10 rounded-full bg-text-1"
                          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 36 }}
                        />
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {mode === "transaction" ? (
                  <motion.div
                    key="transaction"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: reduced ? 0 : 0.16 }}
                    className="space-y-2"
                  >
                    <div className="flex gap-4 border-b border-border text-[13px]">
                      {(["out", "in"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKind(k)}
                          className={`relative min-h-[44px] px-1 py-2 font-medium transition-colors ${
                            kind === k ? "text-text-1" : "text-text-4"
                          }`}
                        >
                          {k === "out" ? "Keluar" : "Masuk"}
                          {kind === k && (
                            <motion.span
                              layoutId="qc-kind"
                              aria-hidden
                              className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-text-1"
                              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 36 }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    <WalletPicker
                      value={walletId}
                      onChange={(id) => {
                        setWalletId(id);
                        rememberWallet(id);
                      }}
                    />
                    {(listening || heard) && (
                      <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${listening ? "bg-accent-soft" : "bg-bg-elev1"}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${listening ? "bg-accent text-accent-fg" : "bg-bg-card text-text-3"}`}>
                          <Mic size={17} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] leading-snug text-text-2">
                          {listening ? (
                            <>Mendengarkan… ucapkan misalnya <b>&ldquo;makan bakso dua puluh lima ribu&rdquo;</b></>
                          ) : (
                            <>&ldquo;{heard}&rdquo;, cek lagi lalu simpan</>
                          )}
                        </span>
                        {listening ? (
                          <button type="button" onClick={() => stopListening.current?.()} className="min-h-[44px] px-2 text-[12px] font-semibold text-text-3">Selesai</button>
                        ) : (
                          <button type="button" onClick={startVoice} className="min-h-[44px] px-2 text-[12px] font-semibold text-accent">Ulangi</button>
                        )}
                      </div>
                    )}
                    {kind === "out" && (
                      <ReceiptScanButton
                        autoStart={open && action === "scan"}
                        onResult={(r) => {
                          if (r.amount) setAmount(String(r.amount));
                          if (r.merchant && !title) setTitle(r.merchant);
                        }}
                      />
                    )}
                    <label htmlFor="qc-amount" className="sr-only">Nominal transaksi</label>
                    <input
                      id="qc-amount"
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      className="input-base h-12 text-lg font-semibold tabular-nums"
                      inputMode="numeric"
                      placeholder="Rp0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    />
                    <label htmlFor="qc-note" className="sr-only">Catatan singkat</label>
                    <input
                      id="qc-note"
                      className="input-base"
                      placeholder="Catatan singkat (opsional)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="qc-category" className="sr-only">Kategori</label>
                        <select
                          id="qc-category"
                          className="input-base"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="qc-who" className="sr-only">Untuk siapa</label>
                        <select
                          id="qc-who"
                          className="input-base"
                          value={who}
                          onChange={(e) => setWho(e.target.value)}
                        >
                          {people.map((p) => (
                            <option key={p} value={p}>{nick(p)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={mode}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: reduced ? 0 : 0.16 }}
                    className="space-y-2"
                  >
                    <label htmlFor="qc-title" className="sr-only">
                      {mode === "moment" ? "Judul moment" : mode === "task" ? "Tugas baru" : "Judul singkat"}
                    </label>
                    <input
                      id="qc-title"
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      className="input-base"
                      placeholder={
                        mode === "moment"
                          ? "Judul moment"
                          : mode === "task"
                            ? "Tugas baru"
                            : "Judul singkat"
                      }
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <label htmlFor="qc-body" className="sr-only">
                      {mode === "moment" ? "Cerita moment" : mode === "task" ? "Detail tugas" : "Isi catatan"}
                    </label>
                    <textarea
                      id="qc-body"
                      className="input-base min-h-[112px] w-full resize-none py-2.5 text-[14px]"
                      placeholder={
                        mode === "moment"
                          ? "Tulis ceritanya…"
                          : mode === "task"
                            ? "Detail opsional…"
                            : "Tulis catatan…"
                      }
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {saved && (
                <div className="mt-3 rounded-[14px] bg-positive-bg px-3 py-2 text-xs font-semibold text-[color:var(--positive)]">
                  {saved}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="btn-accent min-h-[48px] flex-1 disabled:opacity-50"
                >
                  {busy ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
