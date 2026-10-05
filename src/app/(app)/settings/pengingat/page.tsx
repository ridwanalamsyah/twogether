"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { useReminderPrefs } from "@/stores/reminders";
import { REMINDER_TYPES } from "@/lib/reminders";
import { useReminders } from "@/components/reminders/Reminders";
import { isNative } from "@/lib/native";
import { hapticTap } from "@/lib/haptic";

export default function PengingatPage() {
  const enabled = useReminderPrefs((s) => s.enabled);
  const toggle = useReminderPrefs((s) => s.toggle);
  const next = useReminders().filter((r) => r.at.getTime() > Date.now()).slice(0, 5);
  const native = isNative();

  return (
    <div>
      <AppHeader
        title="Pengingat"
        actions={
          <Link href="/settings" className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2">
            Selesai
          </Link>
        }
      />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <p className="text-[13px] leading-relaxed text-text-3">
          {native
            ? "Pengingat dikirim sebagai notifikasi di HP ini, walau Twogether sedang ditutup."
            : "Pengingat muncul sebagai kartu di Beranda. Di app iPhone, pengingat juga datang sebagai notifikasi walau app ditutup."}
        </p>
        <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
          {REMINDER_TYPES.map((t) => (
            <li key={t.id} className="border-b border-border last:border-0">
              <button
                onClick={() => {
                  toggle(t.id);
                  hapticTap();
                }}
                role="switch"
                aria-checked={enabled[t.id]}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-[22px]">{t.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-text-1">{t.label}</span>
                  <span className="block text-[12px] text-text-4">{t.hint}</span>
                </span>
                <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled[t.id] ? "bg-accent" : "bg-bg-elev3"}`}>
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled[t.id] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {next.length > 0 && (
          <div>
            <div className="mb-2 px-1 text-[13px] font-bold text-text-3">Berikutnya</div>
            <ul className="space-y-1.5">
              {next.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-bg-elev1 px-3 py-2.5 text-[13px]">
                  <span>{r.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-text-1">{r.text}</span>
                  <span className="shrink-0 text-text-4">
                    {r.at.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })}{" "}
                    {r.at.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
