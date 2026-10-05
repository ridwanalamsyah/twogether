"use client";

import { useNick } from "@/lib/nick";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { useAuth } from "@/stores/auth";
import { usePeople } from "@/lib/people";
import { useFeatures } from "@/stores/features";
import { FEATURES, tintBg } from "@/data/features";

export default function HomePage() {
  const authName = useAuth((s) => s.name);
  const { me } = usePeople();
  const { nick } = useNick();
  const custom = nick(me);
  const name = custom && custom !== me ? custom : authName;
  const [editing, setEditing] = useState(false);
  const [greeting, setGreeting] = useState("Halo");
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const n = !name ? "" : name === custom ? name : name.split(" ")[0];
    const hi = (word: string, emoji: string) => (n ? `${word}, ${n} ${emoji}` : `${word} ${emoji}`);
    setGreeting(
      h < 4
        ? n
          ? `Belum tidur, ${n}? 🌙`
          : "Belum tidur? 🌙"
        : h < 11
          ? hi("Pagi", "☀️")
          : h < 15
            ? hi("Siang", "🌤️")
            : h < 18
              ? hi("Sore", "🌇")
              : hi("Malam", "🌙"),
    );
    setToday(
      now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
    );
  }, [name]);

  return (
    <div>
      <AppHeader
        eyebrow={today}
        title={greeting}
        actions={
          <button
            onClick={() => setEditing((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              editing ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-2"
            }`}
            aria-pressed={editing}
          >
            {editing ? "Selesai" : "Susun"}
          </button>
        }
      />
      {editing && (
        <div className="pop-in mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-2.5 text-[13px] text-text-2">
          <span>✋ Geser kartu untuk pindah posisi. Tap − untuk sembunyikan.</span>
          <Link
            href="/settings/dashboard"
            className="shrink-0 font-semibold text-accent"
          >
            + Kartu lain
          </Link>
        </div>
      )}
      <DashboardGrid editing={editing} />
      {!editing && <ToolsRow />}
    </div>
  );
}

// The couple's own spaces (picked in Jelajah) — nothing they don't use.
function ToolsRow() {
  const enabled = useFeatures((st) => st.enabled);
  const spaces = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f))
    .slice(0, 7);
  return (
    <section className="mt-6 px-5 pb-6 md:px-8">
      <div className="mb-3 text-[16px] font-extrabold tracking-tight text-text-1">
        Ruang kalian
      </div>
      <div className="grid grid-cols-4 gap-y-4 md:grid-cols-6 lg:grid-cols-8">
        {spaces.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="pressable flex flex-col items-center gap-1.5"
          >
            <span
              className="grid h-[56px] w-[56px] place-items-center rounded-[18px] text-[26px] leading-none"
              style={{ background: tintBg(f.tint, 18) }}
            >
              {f.emoji}
            </span>
            <span className="max-w-[72px] truncate text-[11px] font-medium text-text-2">
              {f.title}
            </span>
          </Link>
        ))}
        <Link href="/fitur" className="pressable flex flex-col items-center gap-1.5">
          <span className="grid h-[56px] w-[56px] place-items-center rounded-[18px] border-2 border-dashed border-border-strong text-[22px] leading-none text-text-3">
            +
          </span>
          <span className="text-[11px] font-medium text-text-3">Tambah</span>
        </Link>
      </div>
    </section>
  );
}
