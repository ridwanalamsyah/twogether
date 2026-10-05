"use client";

import { useNick } from "@/lib/nick";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "@/components/ui/Sheet";
import { useKabar } from "@/components/kabar/useKabar";
import { PINGS, STATUS_PRESETS, pingText, timeAgo } from "@/lib/kabar";
import { parsePayload } from "@/lib/people";
import { hapticSuccess } from "@/lib/haptic";

/** Beranda card: partner's status + one-tap pings. */
export function KabarWidget() {
  const { partner, partnerStatus, myStatus, pings, me, sendPing } = useKabar();
  const { nick } = useNick();
  const [sent, setSent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const lastFromPartner = pings.find((p) => p.who && p.who !== me);
  const name = partner ? nick(partner) : "Pasanganmu";

  async function ping(id: string) {
    await sendPing(id);
    setSent(id);
    setTimeout(() => setSent(null), 1800);
  }

  return (
    <div className="surface p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-[26px]">
          {partnerStatus?.emoji ?? "💭"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-text-3">Kabar {name}</div>
          <div className="truncate text-[15px] font-bold text-text-1">
            {partnerStatus ? partnerStatus.text : "Belum pasang status"}
          </div>
          {partnerStatus ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-4">
              <Battery level={partnerStatus.energy} /> {timeAgo(partnerStatus.at)}
            </div>
          ) : lastFromPartner ? (
            <div className="mt-0.5 truncate text-[11px] text-text-4">
              {pingText(lastFromPartner.valueText ?? "kangen", name).emoji}{" "}
              {timeAgo(lastFromPartner.createdAt)}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-full bg-bg-elev2 px-3 py-1.5 text-[12px] font-semibold text-text-2 active:scale-95"
        >
          {myStatus ? `${myStatus.emoji} Aku` : "Statusku"}
        </button>
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
        {PINGS.map((p) => (
          <button
            key={p.id}
            onClick={() => ping(p.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition-all active:scale-90 ${
              sent === p.id ? "bg-accent text-accent-fg" : "bg-bg-elev1 text-text-2"
            }`}
          >
            <span className="text-[16px]">{p.emoji}</span>
            {sent === p.id ? "Terkirim ✓" : p.label}
          </button>
        ))}
      </div>
      <Link href="/kabar" className="mt-2 block text-center text-[12px] font-medium text-text-3">
        Riwayat kabar ›
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
  const [emoji, setEmoji] = useState(myStatus?.emoji ?? "😊");
  const [text, setText] = useState(myStatus?.text ?? "");
  const [energy, setEnergy] = useState(myStatus?.energy ?? 3);
  async function save() {
    await setStatus({ emoji, text: text.trim() || "—", energy });
    onClose();
  }
  return (
    <Sheet
      title="Statusku"
      onClose={onClose}
      footer={<button onClick={save} className="btn-accent w-full">Pasang status</button>}
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        {STATUS_PRESETS.map((s) => (
          <button
            key={s.text}
            onClick={() => {
              setEmoji(s.emoji);
              setText(s.text);
            }}
            className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium ${
              text === s.text ? "bg-accent text-accent-fg" : "bg-bg-card text-text-2 shadow-card"
            }`}
          >
            <span className="text-[18px]">{s.emoji}</span>
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
            onClick={() => setEnergy(n)}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold ${
              energy === n ? "bg-accent text-accent-fg" : "bg-bg-card text-text-3 shadow-card"
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
      void navigator.serviceWorker?.getRegistration().then((reg) =>
        reg?.showNotification(`${t.emoji} Twogether`, { body: t.text, tag: "ping", icon: "/icons/icon-192.png" }),
      );
    }
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [pings, me]);

  if (!toast || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+10px)] z-[90] flex justify-center px-4">
      <div className="pop-in pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-[20px] bg-bg-card p-3 pr-2 shadow-float">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-[24px]">{toast.emoji}</span>
        <span className="min-w-0 flex-1 text-[14px] font-semibold text-text-1">{toast.text}</span>
        <button
          onClick={async () => {
            await sendPing("kangen");
            setToast(null);
          }}
          className="shrink-0 rounded-full bg-accent px-3 py-2 text-[12px] font-bold text-accent-fg active:scale-95"
        >
          Balas 💗
        </button>
        <button onClick={() => setToast(null)} className="px-1 text-[16px] text-text-4" aria-label="Tutup">
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}
