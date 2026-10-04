"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { sync, type SyncSnapshot } from "@/services/sync";
import { getDB } from "@/lib/db";
import { hasRemoteSync } from "@/lib/supabase";

const SECTIONS: { title: string; rows: { href: string; icon: string; label: string; hint?: string }[] }[] = [
  {
    title: "Akun",
    rows: [
      { href: "/settings/profile", icon: "🙂", label: "Profil", hint: "Nama, foto, ulang tahun" },
      { href: "/settings/security", icon: "🔐", label: "Password & keamanan", hint: "Ganti password, PIN" },
      { href: "/settings/workspace", icon: "💞", label: "Pasangan", hint: "Undang & kelola anggota" },
    ],
  },
  {
    title: "Tampilan",
    rows: [
      { href: "/settings/dashboard", icon: "🧩", label: "Susun Beranda" },
      { href: "/settings/theme", icon: "🎨", label: "Tema & warna" },
    ],
  },
  {
    title: "Lainnya",
    rows: [
      { href: "/settings/finance", icon: "💰", label: "Uang & anggaran" },
      { href: "/settings/privacy", icon: "📦", label: "Data & cadangan", hint: "Unduh atau hapus data" },
      { href: "/settings/trash", icon: "🗑️", label: "Baru dihapus" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());

  useEffect(() => sync.subscribe(setSnap), []);

  const profile = useLiveQuery(
    async () => (auth.userId ? getDB().users.get(auth.userId) : null),
    [auth.userId],
  );
  const displayName = profile?.name ?? auth.name ?? "";
  const displayAvatar = profile?.avatar ?? auth.avatar ?? null;

  async function logout() {
    await auth.signOut();
    router.replace("/auth");
  }

  return (
    <div className="animate-in">
      <AppHeader title="Pengaturan" />

      <div className="px-5 pt-4 pb-6">
        <Link
          href="/settings/profile"
          className="pressable flex items-center gap-3 rounded-[22px] bg-bg-card p-4 shadow-card"
        >
          <div
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-accent-fg"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt={displayName || "avatar"}
                fill
                sizes="44px"
                className="object-cover"
                unoptimized
              />
            ) : (
              (displayName || "T")[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium text-text-1">
              {displayName || "Belum ada nama"}
            </div>
            <div className="truncate text-[12px] text-text-3">{auth.email}</div>
          </div>
          <span className="text-text-4">›</span>
        </Link>

        {SECTIONS.map((sec) => (
          <div key={sec.title} className="mt-6">
            <div className="mb-2 text-[11px] font-medium section-label text-text-4">
              {sec.title}
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-[20px] bg-bg-card shadow-card">
              {sec.rows.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="flex items-center gap-3 px-4 py-3 text-[15px] text-text-1 active:bg-bg-elev1"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-elev1 text-[18px]">
                      {r.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block">{r.label}</span>
                      {r.hint && (
                        <span className="block text-[12px] text-text-4">{r.hint}</span>
                      )}
                    </span>
                    <span className="text-text-4">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <SaveStatus snap={snap} />

        <button
          onClick={logout}
          className="mt-4 w-full rounded-[18px] bg-bg-card py-3.5 text-[14px] font-semibold text-[color:var(--negative)] shadow-card active:scale-[0.99]"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}

/** One plain-language line instead of connection/queue jargon. */
function SaveStatus({ snap }: { snap: SyncSnapshot }) {
  const local = !hasRemoteSync();
  const offline = !local && snap.connection === "offline";
  const waiting = local ? 0 : snap.pending + snap.failed;
  const text = offline
    ? "Sedang tidak ada internet — semua tetap tersimpan di HP ini."
    : waiting > 0
      ? `Menyimpan ${waiting} perubahan…`
      : local
        ? "Semua catatan tersimpan di HP ini."
        : "Semua catatan sudah tersimpan.";
  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-[18px] bg-bg-card px-4 py-3.5 shadow-card">
      <div className="flex items-center gap-2.5 text-[13px] text-text-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            offline
              ? "bg-[color:var(--warning)]"
              : waiting > 0
                ? "animate-pulse bg-[color:var(--info)]"
                : "bg-[color:var(--positive)]"
          }`}
        />
        {text}
      </div>
      {!offline && waiting > 0 && (
        <button
          onClick={() => void sync.drain()}
          className="shrink-0 text-[12px] font-semibold text-text-1 active:opacity-60"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
