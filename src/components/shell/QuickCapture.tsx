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
import { Mic } from "lucide-react";
import { motion } from "framer-motion";
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

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <motion.div aria-hidden className="absolute inset-0 bg-black/40 backdrop-in" {...drag.backdrop} />
      <motion.div
        role="dialog"
        aria-label="Catat apa?"
        className="relative mx-auto w-full max-w-[480px] rounded-t-[24px] border-t border-border bg-bg-app p-5 pb-[calc(var(--sab)+20px)] shadow-2xl sheet-up theme-transition"
        onClick={(e) => e.stopPropagation()}
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
          <button onClick={onClose} className="text-[12px] font-medium text-text-3">
            Tutup
          </button>
        </div>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-1 rounded-full bg-bg-elev2 p-1 text-[11px] font-semibold">
          {[
            ["transaction", "Uang"],
            ["moment", "Moment"],
            ["note", "Catatan"],
            ["task", "Tugas"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id as QuickCaptureMode);
                hapticTap();
              }}
              className={`rounded-full py-2 ${
                mode === id ? "bg-bg-app text-text-1 shadow-sm" : "text-text-3"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "transaction" ? (
          <div className="space-y-2">
            <div className="flex gap-4 border-b border-border text-xs">
              {(["out", "in"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`-mb-px border-b pb-2 font-medium ${
                    kind === k
                      ? "border-text-1 text-text-1"
                      : "border-transparent text-text-4"
                  }`}
                >
                  {k === "out" ? "Keluar" : "Masuk"}
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
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${listening ? "animate-pulse bg-accent text-accent-fg" : "bg-bg-card text-text-3"}`}>
                  <Mic size={17} />
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-text-2">
                  {listening ? (
                    <>Mendengarkan… ucapkan misalnya <b>&ldquo;makan bakso dua puluh lima ribu&rdquo;</b></>
                  ) : (
                    <>&ldquo;{heard}&rdquo; — cek lagi lalu simpan</>
                  )}
                </span>
                {listening ? (
                  <button onClick={() => stopListening.current?.()} className="text-[12px] font-semibold text-text-3">Selesai</button>
                ) : (
                  <button onClick={startVoice} className="text-[12px] font-semibold text-accent">Ulangi</button>
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
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              className="input-base h-12 font-mono text-lg font-semibold"
              inputMode="numeric"
              placeholder="Rp 0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
            <input
              className="input-base"
              placeholder="Catatan singkat (opsional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input-base"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
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
        ) : (
          <div className="space-y-2">
            <input
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
            <textarea
              className="min-h-[112px] w-full resize-none rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-2"
              placeholder={
                mode === "moment"
                  ? "Tulis ceritanya…"
                  : mode === "task"
                    ? "Detail opsional…"
                    : "Tulis cepat seperti Notion…"
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        )}

        {saved && (
          <div className="mt-3 rounded-md bg-positive-bg px-3 py-2 text-xs font-semibold text-[color:var(--positive)]">
            {saved}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-full bg-accent py-3 text-[14px] font-semibold active:scale-[0.98] text-accent-fg disabled:opacity-50"
          >
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
