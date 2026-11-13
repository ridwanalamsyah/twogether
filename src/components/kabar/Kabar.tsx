"use client";

import { useNick } from "@/lib/nick";
import { Check, ChevronRight, Heart, MessageCircleHeart, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "@/components/ui/Sheet";
import { useKabar } from "@/components/kabar/useKabar";
import { PINGS, STATUS_PRESETS, pingText, timeAgo } from "@/lib/kabar";
import { parsePayload } from "@/lib/people";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { notificationText } from "@/stores/privacy";
import { IconTile } from "@/lib/icons";

/** Beranda card: partner's status + one-tap pings. */
export function KabarWidget() {
  const { partner, partnerStatus, myStatus, pings, me, sendPing } = useKabar();
  const { nick } = useNick();
  const reduce = useReducedMotion();
  const [sent, setSent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const lastFromPartner = pings.find((p) => p.who && p.who !== me);
  const name = partner ? nick(partner) : "Pasanganmu";

  async function ping(id: string) {
    hapticTap();
    await sendPing(id);
    setSent(id);
    setTimeout(() => setSent(null), 1800);
  }

  return (
    <div className="surface p-4">
      <div className="flex items-start gap-3">
        {partnerStatus?.emoji ? (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bg-elev1 text-[24px]">
            {partnerStatus.emoji}
          </div>
        ) : (
          <IconTile
            spec={{ Icon: MessageCircleHeart, tint: "var(--accent)" }}
            size={48}
            radius={16}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-text-3">Kabar {name}</div>
          <div className="truncate text-[15px] font-bold text-text-1">
            {partnerStatus ? partnerStatus.text : "Belum pasang status"}
          </div>
          {partnerStatus ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-text-3">
              <Battery level={partnerStatus.energy} /> {timeAgo(partnerStatus.at)}
            </div>
          ) : lastFromPartner ? (
            <div className="mt-0.5 truncate text-[12px] text-text-3">
              {pingText(lastFromPartner.valueText ?? "kangen", name).text} · {timeAgo(lastFromPartner.createdAt)}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-full bg-bg-elev2 px-3 py-1.5 text-[12px] font-semibold text-text-2 transition-transform active:scale-95"
        >
          {myStatus ? `${myStatus.emoji} Aku` : "Statusku"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PINGS.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            layout
            onClick={() => ping(p.id)}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
            className={`flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-2 text-[13px] font-semibold transition-colors duration-200 ${
              sent === p.id ? "bg-accent text-accent-fg" : "bg-bg-elev1 text-text-2 hover:bg-bg-elev2"
            }`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={sent === p.id ? "sent" : "label"}
                className="flex items-center gap-1"
                initial={reduce ? { opacity: 0 } : { y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: -12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
              >
                {sent === p.id ? (
                  <>
                    <Check size={14} strokeWidth={3} aria-hidden /> Terkirim
                  </>
                ) : (
                  p.label
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
      <Link
        href="/kabar"
        className="mt-2.5 inline-flex w-full items-center justify-center gap-0.5 text-[12px] font-medium text-text-3 hover:text-text-1"
      >
        Riwayat kabar
        <ChevronRight size={14} strokeWidth={2.2} aria-hidden />
      </Link>
      {editing && <StatusSheet onClose={() => setEditing(false)} />}
    </div>
  );
}

export function Battery({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]" title={`Energi ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-2 w-1 rounded-[1px] ${i <= level ? (level <= 2 ? "bg-[color:var(--negative)]" : "bg-[color:var(--positive)]") : "bg-bg-elev3"}`}
        />
      ))}
    </span>
  );
}

export function StatusSheet({ onClose }: { onClose: () => void }) {
  const { myStatus, setStatus } = useKabar();
  // Statuses load after the first render: show the live status until the
  // user changes a field (null = untouched).
  const [emojiPick, setEmoji] = useState<string | null>(null);
  const [textPick, setText] = useState<string | null>(null);
  const [energyPick, setEnergy] = useState<number | null>(null);
  const emoji = emojiPick ?? myStatus?.emoji ?? "😊";
  const text = textPick ?? myStatus?.text ?? "";
  const energy = energyPick ?? myStatus?.energy ?? 3;
  async function save() {
    await setStatus({ emoji, text: text.trim() || "Ada", energy });
    onClose();
  }
  return (
    <Sheet
      title="Statusku"
      onClose={onClose}
      footer={<button type="button" onClick={save} className="btn-accent w-full">Pasang status</button>}
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        {STATUS_PRESETS.map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => {
              setEmoji(s.emoji);
              setText(s.text);
            }}
            className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-transform active:scale-95 ${
              text === s.text
                ? "bg-text-1 text-bg-app shadow-card"
                : "bg-bg-card text-text-2 shadow-card"
            }`}
          >
            <span className="text-[18px]" aria-hidden>{s.emoji}</span>
            {s.text}
          </button>
        ))}
      </div>
      <input
        className="input-base mb-4"
        placeholder="Atau tulis sendiri…"
        maxLength={40}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mb-1.5 text-[12px] font-semibold text-text-3">Baterai sosial</div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setEnergy(n)}
            aria-label={`Energi ${n} dari 5`}
            className={`flex-1 rounded-xl py-2.5 text-[15px] font-bold transition-transform active:scale-95 ${
              energy === n ? "bg-text-1 text-bg-app shadow-card" : "bg-bg-card text-text-3 shadow-card"
            }`}
          >
            {["🪫", "😮‍💨", "🙂", "😄", "⚡"][n - 1]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-text-4">Status hilang sendiri setelah 12 jam.</p>
    </Sheet>
  );
}

/**
 * Listens for new pings from the partner while the app is open: shows a
 * toast with a quick reply, and a system notification when the tab is in
 * the background (if allowed). Push (app closed) is handled by the SW.
 */
export function PingListener() {
  const { nick } = useNick();
  const { pings, me, sendPing } = useKabar();
  const [toast, setToast] = useState<{ id: string; emoji: string; text: string } | null>(null);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (seen.current === null) {
      // First render: everything already here counts as seen.
      let stored = 0;
      try {
        stored = Number(localStorage.getItem("twogether:ping-seen")) || 0;
      } catch {
        /* private mode */
      }
      seen.current = Math.max(stored, Date.now() - 2 * 60_000);
    }
    const fresh = pings
      .filter((p) => p.who && p.who !== me && p.createdAt > (seen.current ?? 0))
      .sort((a, b) => a.createdAt - b.createdAt);
    if (!fresh.length) return;
    const latest = fresh[fresh.length - 1];
    seen.current = latest.createdAt;
    try {
      localStorage.setItem("twogether:ping-seen", String(latest.createdAt));
    } catch {
      /* ignore */
    }
    const custom = parsePayload(latest.payload, { text: "" }).text;
    const t = pingText(latest.valueText ?? "kangen", nick(latest.who) || "Pasangan", custom);
    setToast({ id: latest.id, ...t });
    hapticSuccess();
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      void navigator.serviceWorker?.getRegistration().then((reg) => {
        const n = notificationText(`${t.emoji} Twogether`, t.text);
        return reg?.showNotification(n.title, { body: n.body, tag: "ping", icon: "/icons/icon-192.png" });
      });
    }
  }, [pings, me, nick]);

  // Own effect: `pings` changes identity every render, which would keep
  // clearing the timer if it lived in the effect above.
  const toastId = toast?.id;
  useEffect(() => {
    if (!toastId) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toastId]);

  if (!toast || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+10px)] z-[90] flex justify-center px-4">
      <div className="pop-in pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-[20px] bg-bg-card p-3 pr-2 shadow-float">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-[24px]">
          {toast.emoji}
        </span>
        <span className="min-w-0 flex-1 text-[14px] font-semibold text-text-1">{toast.text}</span>
        <button
          type="button"
          onClick={async () => {
            await sendPing("kangen");
            setToast(null);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-2 text-[12px] font-bold text-accent-fg transition-transform active:scale-95"
        >
          <Heart size={13} fill="currentColor" aria-hidden /> Balas
        </button>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-3 hover:bg-bg-elev1"
          aria-label="Tutup"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
