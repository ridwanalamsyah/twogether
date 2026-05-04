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
    <div className="animate-in">
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
        <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-bg-app px-3 py-2 text-[12px] text-text-3">
          <span>Drag widget untuk menyusun ulang.</span>
          <Link
            href="/settings/dashboard"
            className="font-medium text-text-1 underline underline-offset-2"
          >
            Atur
          </Link>
        </div>
      )}
      <DashboardGrid editing={editing} />
      {!editing && <ToolsRow />}
    </div>
  );
}

const TOOLS: { href: string; label: string }[] = [
  { href: "/pencapaian", label: "Pencapaian" },
  { href: "/insights", label: "Insights" },
  { href: "/digest", label: "Digest" },
  { href: "/uang", label: "Keuangan+" },
  { href: "/calendar", label: "Kalender" },
  { href: "/sehat", label: "Sehat" },
  { href: "/kita", label: "Kita" },
  { href: "/belajar", label: "Belajar" },
  { href: "/rumah", label: "Rumah" },
  { href: "/list", label: "List" },
  { href: "/habits", label: "Habits" },
  { href: "/reflection", label: "Refleksi" },
  { href: "/skripsi", label: "Skripsi" },
  { href: "/travel", label: "Travel" },
];

function ToolsRow() {
  return (
    <div className="mt-6 px-5">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
        Lainnya
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex-shrink-0 rounded-md border border-border bg-bg-app px-3 py-1.5 text-[12px] font-medium text-text-2 hover:bg-bg-elev1"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
