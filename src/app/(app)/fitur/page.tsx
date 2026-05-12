"use client";

import Link from "next/link";
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
    title: "Pintasan utama",
    items: [
      {
        href: "/home",
        emoji: "🏠",
        title: "Home",
        subtitle: "Dashboard utama harian",
      },
      {
        href: "/tracker",
        emoji: "📊",
        title: "Tracker",
        subtitle: "Catat & lihat transaksi",
      },
      {
        href: "/goals",
        emoji: "🎯",
        title: "Goals",
        subtitle: "Tabungan & target bersama",
      },
      {
        href: "/moments",
        emoji: "💝",
        title: "Moments",
        subtitle: "Jurnal momen berdua",
      },
    ],
  },
  {
    title: "Uang & keuangan",
    items: [
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
  {
    title: "Pengaturan",
    items: [
      {
        href: "/settings/profile",
        emoji: "👤",
        title: "Profil",
        subtitle: "Nama, ulang tahun, avatar",
      },
      {
        href: "/settings/workspace",
        emoji: "🤝",
        title: "Workspace",
        subtitle: "Anggota & undangan",
      },
      {
        href: "/settings/dashboard",
        emoji: "🧩",
        title: "Dashboard",
        subtitle: "Atur widget di Home",
      },
      {
        href: "/settings/theme",
        emoji: "🎨",
        title: "Tema",
        subtitle: "Mode terang / gelap / sistem",
      },
      {
        href: "/settings/finance",
        emoji: "💳",
        title: "Keuangan",
        subtitle: "Kategori & default keuangan",
      },
      {
        href: "/settings/security",
        emoji: "🔒",
        title: "Keamanan",
        subtitle: "PIN, enkripsi end-to-end",
      },
      {
        href: "/settings/privacy",
        emoji: "🛡️",
        title: "Privasi",
        subtitle: "Export, import, hapus data",
      },
      {
        href: "/settings/trash",
        emoji: "🗑️",
        title: "Sampah",
        subtitle: "Pulihkan data yang dihapus",
      },
    ],
  },
];

export default function AllFeaturesPage() {
  return (
    <div className="animate-in">
      <AppHeader
        title="Semua Fitur"
        subtitle="Pintasan ke setiap modul Twogether"
      />

      <div className="space-y-6 px-4 pb-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-text-4">
              {group.title}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex h-full flex-col gap-1 rounded-xl border border-border bg-bg-elev1 p-3 active:scale-[0.98] active:opacity-80"
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
