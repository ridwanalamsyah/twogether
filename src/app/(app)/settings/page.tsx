"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { sync, type SyncSnapshot } from "@/services/sync";
import { useTheme } from "@/stores/theme";
import { seedSampleData } from "@/services/seed";

const SECTIONS: { title: string; rows: { href: string; label: string }[] }[] = [
  {
    title: "Akun",
    rows: [
      { href: "/settings/profile", label: "Profil" },
      { href: "/settings/workspace", label: "Workspace" },
    ],
  },
  {
    title: "Tampilan",
    rows: [
      { href: "/settings/dashboard", label: "Dashboard" },
      { href: "/settings/theme", label: "Tema" },
    ],
  },
  {
    title: "Data",
    rows: [
      { href: "/settings/finance", label: "Keuangan" },
      { href: "/settings/security", label: "Keamanan" },
      { href: "/settings/privacy", label: "Privasi" },
      { href: "/settings/trash", label: "Sampah" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const themeMode = useTheme((s) => s.mode);
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());

  useEffect(() => sync.subscribe(setSnap), []);

  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  async function logout() {
    await auth.signOut();
    router.replace("/auth");
  }

  async function seedNow() {
    if (!auth.userId || !auth.name) return;
    setSeeding(true);
    try {
      await seedSampleData({ userId: auth.userId, primaryWho: auth.name });
      setSeeded(true);
      setTimeout(() => setSeeded(false), 2000);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="animate-in">
      <AppHeader title="Settings" />

      <div className="px-5 pt-4 pb-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-text-1 text-sm font-semibold text-bg-app">
            {(auth.name ?? "B")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium text-text-1">{auth.name}</div>
            <div className="truncate text-[12px] text-text-3">{auth.email}</div>
          </div>
        </div>

        {SECTIONS.map((sec) => (
          <div key={sec.title} className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              {sec.title}
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {sec.rows.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="flex items-center justify-between py-3 text-[14px] text-text-1 active:opacity-60"
                  >
                    <span>{r.label}</span>
                    <span className="text-text-4">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
            Status
          </div>
          <div className="grid grid-cols-3 gap-3 border-y border-border py-3">
            <Stat label="Koneksi" value={snap.connection === "online" ? "Online" : "Offline"} />
            <Stat label="Antrian" value={`${snap.pending}`} />
            <Stat
              label="Tema"
              value={themeMode === "system" ? "System" : themeMode === "dark" ? "Dark" : "Light"}
            />
          </div>
          <button
            onClick={() => void sync.drain()}
            className="mt-3 w-full rounded-md border border-border py-2 text-[12px] font-medium text-text-2"
          >
            Sinkron sekarang
          </button>
        </div>

        <button
          onClick={seedNow}
          disabled={seeding}
          className="mt-3 w-full rounded-md border border-border py-2 text-[12px] font-medium text-text-2 disabled:opacity-60"
        >
          {seeding
            ? "Mengisi…"
            : seeded
              ? "Contoh data ditambahkan"
              : "Isi contoh data"}
        </button>

        <button
          onClick={logout}
          className="mt-3 w-full rounded-md py-2 text-[12px] font-medium text-[color:var(--negative)]"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-text-4">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium text-text-1">{value}</div>
    </div>
  );
}
