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

type FeatureCard = {
  href: string;
  label: string;
  emoji: string;
  sub: string;
  tone: string;
};

const FEATURES: FeatureCard[] = [
  {
    href: "/sehat",
    label: "Sehat",
    emoji: "💧",
    sub: "Air, mood, tidur, olahraga",
    tone: "from-sky-100 to-sky-50",
  },
  {
    href: "/kita",
    label: "Kita",
    emoji: "💞",
    sub: "Anniversary, datenight, apresiasi",
    tone: "from-rose-100 to-rose-50",
  },
  {
    href: "/uang",
    label: "Keuangan+",
    emoji: "💰",
    sub: "Hutang, langganan, payday",
    tone: "from-emerald-100 to-emerald-50",
  },
  {
    href: "/belajar",
    label: "Belajar",
    emoji: "📖",
    sub: "Pomodoro, jurnal, buku",
    tone: "from-amber-100 to-amber-50",
  },
  {
    href: "/jadwal",
    label: "Jadwal",
    emoji: "🎓",
    sub: "Kuliah Semester 6",
    tone: "from-violet-100 to-violet-50",
  },
  {
    href: "/calendar",
    label: "Kalender",
    emoji: "📅",
    sub: "Libur, deadline, jadwal",
    tone: "from-indigo-100 to-indigo-50",
  },
  {
    href: "/rumah",
    label: "Rumah",
    emoji: "🏠",
    sub: "Belanja, meal plan, maintenance",
    tone: "from-orange-100 to-orange-50",
  },
  {
    href: "/list",
    label: "List",
    emoji: "🌟",
    sub: "Wishlist, gift, skincare",
    tone: "from-pink-100 to-pink-50",
  },
  {
    href: "/grafik",
    label: "Grafik",
    emoji: "📊",
    sub: "Tren 30 hari semua tracker",
    tone: "from-cyan-100 to-cyan-50",
  },
  {
    href: "/insights",
    label: "Insights",
    emoji: "🧭",
    sub: "Pola kebiasaan & saran",
    tone: "from-teal-100 to-teal-50",
  },
  {
    href: "/pencapaian",
    label: "Pencapaian",
    emoji: "🏆",
    sub: "Streak, badge, kudos",
    tone: "from-yellow-100 to-yellow-50",
  },
  {
    href: "/habits",
    label: "Habits",
    emoji: "✅",
    sub: "Rutinitas harian",
    tone: "from-fuchsia-100 to-fuchsia-50",
  },
  {
    href: "/reflection",
    label: "Refleksi",
    emoji: "📝",
    sub: "Jurnal harian & syukur",
    tone: "from-lime-100 to-lime-50",
  },
  {
    href: "/goals",
    label: "Goals",
    emoji: "🎯",
    sub: "Target tabungan & deadline",
    tone: "from-emerald-100 to-emerald-50",
  },
  {
    href: "/travel",
    label: "Travel",
    emoji: "✈️",
    sub: "Trip & itinerary bareng",
    tone: "from-blue-100 to-blue-50",
  },
  {
    href: "/skripsi",
    label: "Skripsi",
    emoji: "🎓",
    sub: "Bab, bimbingan, progress",
    tone: "from-purple-100 to-purple-50",
  },
  {
    href: "/moments",
    label: "Moments",
    emoji: "💌",
    sub: "Catatan & kenangan",
    tone: "from-pink-100 to-pink-50",
  },
];

function ToolsRow() {
  return (
    <div className="mt-6 px-5 pb-28">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-4">
        Jelajahi
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`group flex flex-col gap-1 rounded-2xl border border-border bg-gradient-to-br ${f.tone} p-3.5 transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            <div className="text-[26px] leading-none">{f.emoji}</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-900">
              {f.label}
            </div>
            <div className="text-[11px] leading-tight text-slate-600">
              {f.sub}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
