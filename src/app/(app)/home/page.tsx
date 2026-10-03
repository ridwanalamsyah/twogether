"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { useAuth } from "@/stores/auth";
import { useFeatures } from "@/stores/features";
import { FEATURES } from "@/data/features";

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

// The couple's own spaces (picked in Jelajah) — nothing they don't use.
function ToolsRow() {
  const enabled = useFeatures((st) => st.enabled);
  const spaces = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f))
    .slice(0, 7);
  return (
    <section className="mt-6 px-5 pb-6">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-4">
        Ruang kalian
      </div>
      <div className="grid grid-cols-4 gap-y-4">
        {spaces.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="pressable flex flex-col items-center gap-1.5"
          >
            <span className="grid h-[52px] w-[52px] place-items-center rounded-[16px] border border-border bg-bg-elev1 text-[24px] leading-none">
              {f.emoji}
            </span>
            <span className="max-w-[72px] truncate text-[11px] font-medium text-text-2">
              {f.title}
            </span>
          </Link>
        ))}
        <Link href="/fitur" className="pressable flex flex-col items-center gap-1.5">
          <span className="grid h-[52px] w-[52px] place-items-center rounded-[16px] border border-dashed border-border-strong text-[22px] leading-none text-text-3">
            +
          </span>
          <span className="text-[11px] font-medium text-text-3">Tambah</span>
        </Link>
      </div>
    </section>
  );
}
