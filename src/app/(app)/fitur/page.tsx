"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";

interface FeatureItem {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
}

interface FeatureGroup {
  title: string;
  items: FeatureItem[];
}

// Curated list of every reachable feature in the app, grouped by
// intent. Bottom-nav features (home/tracker/goals/moments/settings) are
// repeated here so this page works as a single "table of contents".
const GROUPS: FeatureGroup[] = [
  {
    title: "Uang & keuangan",
    items: [
      {
        href: "/goals",
        emoji: "🎯",
        title: "Goals",
        subtitle: "Tabungan & target bersama",
      },
      {
        href: "/uang",
        emoji: "💰",
        title: "Keuangan+",
        subtitle: "Hutang, langganan, payday, closing bulanan",
      },
      {
        href: "/grafik",
        emoji: "📈",
        title: "Grafik",
        subtitle: "Tren 30 hari terakhir",
      },
      {
        href: "/insights",
        emoji: "🔎",
        title: "Insights",
        subtitle: "Insight pengeluaran & saving",
      },
      {
        href: "/digest",
        emoji: "📬",
        title: "Digest",
        subtitle: "Ringkasan harian / mingguan",
      },
    ],
  },
  {
    title: "Habits & rutinitas",
    items: [
      {
        href: "/habits",
        emoji: "🌱",
        title: "Habits",
        subtitle: "Kebiasaan harian & streak",
      },
      {
        href: "/pencapaian",
        emoji: "🏆",
        title: "Pencapaian",
        subtitle: "Streak · badge · apresiasi",
      },
      {
        href: "/sehat",
        emoji: "💪",
        title: "Sehat",
        subtitle: "Body, tidur, air, olahraga, mood, obat",
      },
      {
        href: "/reflection",
        emoji: "🪞",
        title: "Refleksi",
        subtitle: "Refleksi harian / mingguan",
      },
    ],
  },
  {
    title: "Kehidupan berdua",
    items: [
      {
        href: "/moments",
        emoji: "💌",
        title: "Moments",
        subtitle: "Jurnal & kenangan berdua",
      },
      {
        href: "/kita",
        emoji: "👫",
        title: "Kita",
        subtitle: "Tanggal penting, date night, apresiasi",
      },
      {
        href: "/calendar",
        emoji: "🗓️",
        title: "Kalender",
        subtitle: "Lihat semua jadwal di satu tempat",
      },
      {
        href: "/rumah",
        emoji: "🏘️",
        title: "Rumah",
        subtitle: "Belanja, stok, meal plan, maintenance",
      },
      {
        href: "/travel",
        emoji: "✈️",
        title: "Travel",
        subtitle: "Rencana trip & catatan perjalanan",
      },
    ],
  },
  {
    title: "Studi & produktivitas",
    items: [
      {
        href: "/belajar",
        emoji: "📚",
        title: "Belajar",
        subtitle: "Reading, kursus, jurnal, pomodoro",
      },
      {
        href: "/jadwal",
        emoji: "📅",
        title: "Jadwal kuliah",
        subtitle: "Atur kelas mingguan",
      },
      {
        href: "/skripsi",
        emoji: "🎓",
        title: "Skripsi",
        subtitle: "Bab, bimbingan, deadline",
      },
      {
        href: "/list",
        emoji: "📝",
        title: "List",
        subtitle: "Wishlist, gift, media, OOTD, skincare",
      },
    ],
  },
  {
    title: "Tahunan & spesial",
    items: [
      {
        href: "/wrapped",
        emoji: "🎁",
        title: "Wrapped",
        subtitle: "Ringkasan tahunan kalian",
      },
    ],
  },
];

export default function AllFeaturesPage() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) =>
        `${it.title} ${it.subtitle}`.toLowerCase().includes(needle),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <div>
      <AppHeader title="Jelajah" subtitle="Semua ruang kalian berdua" />

      <div className="px-4 pt-3 pb-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari fitur… (mis. hutang, tidur, trip)"
          className="input-base h-10 bg-bg-elev1 text-[14px]"
        />
      </div>

      <div className="space-y-6 px-4 pt-3 pb-8">
        {groups.length === 0 && (
          <div className="py-10 text-center text-[13px] text-text-4">
            Tidak ada fitur yang cocok dengan “{q}”.
          </div>
        )}
        {groups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-text-4">
              {group.title}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="pressable flex h-full flex-col gap-1 rounded-xl border border-border bg-bg-elev1 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{item.emoji}</span>
                      <span className="truncate text-[13px] font-semibold text-text-1">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[11px] leading-snug text-text-3">
                      {item.subtitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
