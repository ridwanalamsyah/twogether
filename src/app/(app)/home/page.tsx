"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { useAuth } from "@/stores/auth";

export default function HomePage() {
  const name = useAuth((s) => s.name);
  const [editing, setEditing] = useState(false);
  const [greeting, setGreeting] = useState("Selamat datang");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 4
        ? "Belum tidur"
        : h < 11
          ? "Selamat pagi"
          : h < 15
            ? "Selamat siang"
            : h < 18
              ? "Selamat sore"
              : "Selamat malam",
    );
  }, []);

  return (
    <div>
      <AppHeader
        title={greeting + (name ? `, ${name.split(" ")[0]}` : "")}
        actions={
          <button
            onClick={() => setEditing((v) => !v)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              editing ? "bg-accent text-accent-fg" : "text-text-2 hover:bg-bg-elev2"
            }`}
            aria-pressed={editing}
          >
            {editing ? "Selesai" : "Susun"}
          </button>
        }
      />
      {editing && (
        <div className="pop-in mx-5 mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elev1 px-3 py-2 text-[12px] text-text-3">
          <span>Tahan & geser kartu untuk mengatur urutan.</span>
          <Link
            href="/settings/dashboard"
            className="font-medium text-text-1 underline underline-offset-2"
          >
            Pilih widget
          </Link>
        </div>
      )}
      <DashboardGrid editing={editing} />
      {!editing && <ToolsRow />}
    </div>
  );
}

type Shortcut = { href: string; label: string; emoji: string };

// Just the most-used spaces; the full catalogue lives in the Jelajah tab.
const SHORTCUTS: Shortcut[] = [
  { href: "/goals", label: "Goals", emoji: "🎯" },
  { href: "/moments", label: "Moments", emoji: "💌" },
  { href: "/kita", label: "Kita", emoji: "💞" },
  { href: "/sehat", label: "Sehat", emoji: "💧" },
  { href: "/jadwal", label: "Jadwal", emoji: "🎓" },
  { href: "/calendar", label: "Kalender", emoji: "📅" },
  { href: "/rumah", label: "Rumah", emoji: "🏠" },
  { href: "/fitur", label: "Semua", emoji: "✨" },
];

function ToolsRow() {
  return (
    <section className="mt-6 px-5 pb-6">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-4">
        Pintasan
      </div>
      <div className="grid grid-cols-4 gap-y-4">
        {SHORTCUTS.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="pressable flex flex-col items-center gap-1.5"
          >
            <span className="grid h-[52px] w-[52px] place-items-center rounded-[16px] border border-border bg-bg-elev1 text-[24px] leading-none">
              {f.emoji}
            </span>
            <span className="text-[11px] font-medium text-text-2">{f.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
