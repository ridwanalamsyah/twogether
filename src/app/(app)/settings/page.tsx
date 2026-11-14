"use client";

import { IconTile, type IconSpec } from "@/lib/icons";
import { Archive, Bell, Heart, LayoutDashboard, LockKeyhole, Megaphone, MessageCircleHeart, Palette, Trash2, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { sync, type SyncSnapshot } from "@/services/sync";
import { getDB } from "@/lib/db";
import { hasRemoteSync } from "@/lib/supabase";
import { lastBackupAt } from "@/services/privacy";
import { FeedbackSheet } from "@/components/settings/FeedbackSheet";
import { WhatsNewSheet } from "@/components/shell/WhatsNew";

const SECTIONS: { title: string; rows: { href: string; icon: IconSpec; label: string; hint?: string }[] }[] = [
  {
    title: "Akun",
    rows: [
      { href: "/settings/profile", icon: { Icon: UserRound, tint: "var(--tint-blue)" }, label: "Profil", hint: "Nama, foto, ulang tahun" },
      { href: "/settings/security", icon: { Icon: LockKeyhole, tint: "var(--tint-slate)" }, label: "Password & keamanan", hint: "Ganti password, PIN, privasi" },
      { href: "/settings/workspace", icon: { Icon: Heart, tint: "var(--tint-pink)" }, label: "Pasangan", hint: "Undang & kelola anggota" },
    ],
  },
  {
    title: "Tampilan",
    rows: [
      { href: "/settings/dashboard", icon: { Icon: LayoutDashboard, tint: "var(--tint-violet)" }, label: "Susun Beranda" },
      { href: "/settings/theme", icon: { Icon: Palette, tint: "var(--tint-orange)" }, label: "Tema & warna" },
      { href: "/settings/pengingat", icon: { Icon: Bell, tint: "var(--tint-red)" }, label: "Pengingat", hint: "Tagihan, tanggal penting, catat uang" },
    ],
  },
  {
    title: "Lainnya",
    rows: [
      { href: "/settings/finance", icon: { Icon: Wallet, tint: "var(--tint-amber)" }, label: "Uang & anggaran" },
      { href: "/settings/privacy", icon: { Icon: Archive, tint: "var(--tint-sky)" }, label: "Data & cadangan", hint: "Unduh atau hapus data" },
      { href: "/settings/trash", icon: { Icon: Trash2, tint: "var(--tint-slate)" }, label: "Baru dihapus" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [snap, setSnap] = useState<SyncSnapshot>(() => sync.getSnapshot());

  useEffect(() => sync.subscribe(setSnap), []);
  const [backupDue, setBackupDue] = useState(false);
  const [sheet, setSheet] = useState<"feedback" | "new" | null>(null);
  useEffect(() => {
    const t = lastBackupAt();
    setBackupDue(!t || Date.now() - t > 30 * 86_400_000);
  }, []);

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
            style={{ background: "var(--accent)" }}
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
          <span className="text-text-4" aria-hidden>›</span>
        </Link>

        {SECTIONS.map((sec) => (
          <div key={sec.title} className="mt-6">
            <div className="mb-2 text-[12px] font-medium section-label text-text-4">
              {sec.title}
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-[20px] bg-bg-card shadow-card">
              {sec.rows.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="flex min-h-[48px] items-center gap-3 px-4 py-3 text-[15px] text-text-1 active:bg-bg-elev1"
                  >
                    <IconTile spec={r.icon} size={36} radius={11} />
                    <span className="min-w-0 flex-1">
                      <span className="block">{r.label}</span>
                      {r.href === "/settings/privacy" && backupDue ? (
                        <span className="block text-[12px] font-semibold text-[color:var(--warning)]">Sudah waktunya cadangkan data</span>
                      ) : r.hint && (
                        <span className="block text-[12px] text-text-4">{r.hint}</span>
                      )}
                    </span>
                    <span className="text-text-4" aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-6">
          <div className="mb-2 text-[12px] font-medium section-label text-text-4">Bantuan</div>
          <ul className="divide-y divide-border overflow-hidden rounded-[20px] bg-bg-card shadow-card">
            {(
              [
                ["new", { Icon: Megaphone, tint: "var(--tint-purple)" }, "Yang baru", "Perubahan terakhir di app"],
                ["feedback", { Icon: MessageCircleHeart, tint: "var(--tint-pink)" }, "Kirim masukan", "Lapor error atau usul fitur"],
              ] as const
            ).map(([id, icon, label, hint]) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSheet(id)}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-text-1 active:bg-bg-elev1"
                >
                  <IconTile spec={icon} size={36} radius={11} />
                  <span className="min-w-0 flex-1">
                    <span className="block">{label}</span>
                    <span className="block text-[12px] text-text-4">{hint}</span>
                  </span>
                  <span className="text-text-4" aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <AnimatePresence>
          {sheet === "feedback" && <FeedbackSheet key="feedback-sheet" onClose={() => setSheet(null)} />}
          {sheet === "new" && <WhatsNewSheet key="whats-new-sheet" onClose={() => setSheet(null)} />}
        </AnimatePresence>

        <SaveStatus snap={snap} />

        <button
          type="button"
          onClick={logout}
          className="mt-4 min-h-[48px] w-full rounded-[18px] bg-bg-card py-3.5 text-[14px] font-semibold text-[color:var(--negative)] shadow-card active:scale-[0.99]"
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
    ? "Sedang tidak ada internet, semua tetap tersimpan di HP ini."
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
                ? "bg-[color:var(--info)]"
                : "bg-[color:var(--positive)]"
          }`}
          aria-hidden="true"
        />
        {text}
      </div>
      {!offline && waiting > 0 && (
        <button
          type="button"
          onClick={() => void sync.retryFailed()}
          className="min-h-[44px] shrink-0 px-2 text-[12px] font-semibold text-text-1 active:opacity-60"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
