"use client";

import { useNick } from "@/lib/nick";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useKabar } from "@/components/kabar/useKabar";
import { Battery, StatusSheet } from "@/components/kabar/Kabar";
import { PINGS, pingText, timeAgo } from "@/lib/kabar";
import { parsePayload } from "@/lib/people";

export default function KabarPage() {
  const { me, partner, pings, myStatus, partnerStatus, sendPing } = useKabar();
  const { nick } = useNick();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const mineWeek = pings.filter((p) => p.who === me && p.createdAt > weekAgo).length;
  const theirsWeek = pings.filter((p) => p.who !== me && p.createdAt > weekAgo).length;

  return (
    <div>
      <AppHeader title="Kabar" />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { who: "Kamu", s: myStatus, onClick: () => setEditing(true) },
            { who: partner ? nick(partner) : "Pasangan", s: partnerStatus },
          ].map((x) => (
            <button
              key={x.who}
              onClick={x.onClick}
              disabled={!x.onClick}
              className="surface p-4 text-left"
            >
              <div className="text-[28px] leading-none">{x.s?.emoji ?? "💭"}</div>
              <div className="mt-2 text-[12px] font-semibold text-text-3">{x.who}</div>
              <div className="truncate text-[14px] font-bold text-text-1">{x.s?.text ?? "Belum ada status"}</div>
              {x.s && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-4">
                  <Battery level={x.s.energy} /> {timeAgo(x.s.at)}
                </div>
              )}
              {x.onClick && <div className="mt-2 text-[12px] font-semibold text-accent">Ubah ›</div>}
            </button>
          ))}
        </div>

        <div className="surface p-4">
          <div className="mb-2 text-[14px] font-bold text-text-1">Kirim ke {partner ? nick(partner) : "pasangan"}</div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {PINGS.map((p) => (
              <button
                key={p.id}
                onClick={() => sendPing(p.id)}
                className="rounded-2xl bg-bg-elev1 py-3 text-center active:scale-95"
              >
                <div className="text-[22px]">{p.emoji}</div>
                <div className="text-[12px] font-semibold text-text-2">{p.label}</div>
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              void sendPing("custom", text);
              setText("");
            }}
            className="flex gap-2"
          >
            <input
              className="input-base h-11 flex-1"
              maxLength={80}
              placeholder="Pesan singkat…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button disabled={!text.trim()} className="rounded-full bg-accent px-4 text-[14px] font-bold text-accent-fg disabled:opacity-40">
              Kirim
            </button>
          </form>
        </div>

        <div className="flex items-baseline justify-between px-1">
          <span className="text-[16px] font-extrabold text-text-1">Riwayat</span>
          <span className="text-[12px] text-text-3">
            Minggu ini: kamu {mineWeek} · {partner ? nick(partner) : "dia"} {theirsWeek}
          </span>
        </div>
        {pings.length === 0 ? (
          <div className="rounded-[20px] border-2 border-dashed border-border py-10 text-center text-[13px] text-text-3">
            Belum ada kabar. Kirim 💗 pertama!
          </div>
        ) : (
          <ul className="space-y-2">
            {pings.slice(0, 60).map((p) => {
              const mine = p.who === me;
              const t = pingText(p.valueText ?? "kangen", mine ? "Kamu" : p.who ?? "Pasangan", parsePayload(p.payload, { text: "" }).text);
              return (
                <li key={p.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-[18px] px-3.5 py-2.5 text-[14px] ${
                      mine ? "rounded-br-md bg-accent text-accent-fg" : "rounded-bl-md bg-bg-card text-text-1 shadow-card"
                    }`}
                  >
                    {t.emoji} {t.text}
                    <div className={`mt-0.5 text-[10px] ${mine ? "text-white/75" : "text-text-4"}`}>{timeAgo(p.createdAt)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {editing && <StatusSheet onClose={() => setEditing(false)} />}
    </div>
  );
}
