"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  onClose,
}: {
  open: boolean;
  initialMode?: QuickCaptureMode;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const router = useRouter();
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [who, setWho] = useState(people[0]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSaved(null);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, initialMode]);

  useEffect(() => {
    if (!people.includes(who)) setWho(people[0]);
  }, [people, who]);

  async function submit() {
    if (!userId || busy) return;
    setBusy(true);
    setSaved(null);
    try {
      if (mode === "transaction") {
        const num = parseFloat(amount);
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
        });
        setAmount("");
        setTitle("");
        setSaved("Transaksi tersimpan offline");
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
        setSaved("Task tersimpan");
      }
      hapticSuccess();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function openFullPage() {
    hapticTap();
    const href =
      mode === "transaction"
        ? "/tracker"
        : mode === "moment"
          ? "/moments"
          : mode === "task"
            ? "/list"
            : "/reflection";
    onClose();
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[480px] rounded-t-[24px] border-t border-border bg-bg-app p-5 pb-[calc(var(--sab)+20px)] shadow-2xl slide-up theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-text-1">
              Quick capture
            </div>
            <div className="text-[11px] text-text-3">
              Offline-first · tersinkron nanti
            </div>
          </div>
          <button onClick={onClose} className="text-[12px] font-medium text-text-3">
            Tutup
          </button>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-1 rounded-full bg-bg-elev2 p-1 text-[11px] font-semibold">
          {[
            ["transaction", "Uang"],
            ["moment", "Moment"],
            ["note", "Note"],
            ["task", "Task"],
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
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              className="input-base h-12 font-mono text-lg font-semibold"
              inputMode="numeric"
              placeholder="Rp 0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
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
                  <option key={p}>{p}</option>
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
                    ? "Task baru"
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
            onClick={openFullPage}
            className="rounded-full border border-border px-4 py-2.5 text-[13px] font-semibold text-text-2"
          >
            Buka halaman
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-full bg-accent py-2.5 text-[13px] font-semibold text-accent-fg disabled:opacity-50"
          >
            {busy ? "Menyimpan…" : "Simpan cepat"}
          </button>
        </div>
      </div>
    </div>
  );
}
