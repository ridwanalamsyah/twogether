"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  deleteAccount,
  downloadExport,
  downloadCsv,
  exportAll,
  exportGoalsCsv,
  exportMomentsCsv,
  exportTransactionsCsv,
  importBundle,
  wipeLocal,
} from "@/services/privacy";

export default function PrivacyPage() {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const signOut = useAuth((s) => s.signOut);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleExport() {
    if (!userId) return;
    setBusy("export");
    try {
      const bundle = await exportAll(userId);
      downloadExport(bundle);
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(file: File) {
    if (!userId) return;
    setBusy("import");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const { imported } = await importBundle(userId, json);
      showToast(
        "ok",
        `${imported} catatan berhasil dipulihkan.`,
      );
    } catch {
      showToast("err", "File cadangan tidak bisa dibaca. Pastikan memilih file dari Twogether.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCsvExport() {
    if (!userId) return;
    setBusy("csv");
    try {
      const csv = await exportTransactionsCsv(userId);
      downloadCsv(csv, "twogether-transaksi.csv");
    } finally {
      setBusy(null);
    }
  }

  async function handleGoalsCsv() {
    if (!userId) return;
    setBusy("csvGoals");
    try {
      const csv = await exportGoalsCsv(userId);
      downloadCsv(csv, "twogether-goals.csv");
    } finally {
      setBusy(null);
    }
  }

  async function handleMomentsCsv() {
    if (!userId) return;
    setBusy("csvMoments");
    try {
      const csv = await exportMomentsCsv(userId);
      downloadCsv(csv, "twogether-moments.csv");
    } finally {
      setBusy(null);
    }
  }

  async function handleWipe() {
    if (!userId) return;
    if (!confirm("Hapus semua catatan dari HP ini? Data yang sudah tersimpan di akunmu tetap aman.")) return;
    setBusy("wipe");
    try {
      await wipeLocal(userId);
      await signOut();
      router.replace("/auth");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!userId) return;
    if (
      !confirm(
        "Hapus akun dan semua catatan? Ini tidak bisa dibatalkan.",
      )
    )
      return;
    setBusy("delete");
    try {
      await deleteAccount(userId);
      await signOut();
      router.replace("/auth");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-in">
      <AppHeader
        title="Data & cadangan"
        actions={
          <Link
            href="/settings"
            className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
          >
            Selesai
          </Link>
        }
      />

      <div className="space-y-3 px-4 pb-8 text-sm">
        <Section
          title="Cadangan"
          description="Simpan salinan catatan kalian, atau pindahkan ke HP lain."
        >
          <ActionRow
            emoji="⬇️"
            label="Unduh cadangan lengkap"
            sub="Semua catatan dalam satu file, bisa dipulihkan lagi nanti"
            onClick={handleExport}
            busy={busy === "export"}
          />
          <ActionRow
            emoji="📄"
            label="Unduh transaksi (spreadsheet)"
            sub="Bisa dibuka di Excel, Numbers, atau Google Sheets"
            onClick={handleCsvExport}
            busy={busy === "csv"}
          />
          <ActionRow
            emoji="🎯"
            label="Unduh goals (spreadsheet)"
            sub="Termasuk total tabungan tiap goal"
            onClick={handleGoalsCsv}
            busy={busy === "csvGoals"}
          />
          <ActionRow
            emoji="📖"
            label="Unduh moments (spreadsheet)"
            sub="Moment yang dikunci tidak ikut — pakai cadangan lengkap"
            onClick={handleMomentsCsv}
            busy={busy === "csvMoments"}
          />
          <label className="block">
            <ActionRow
              emoji="⬆️"
              label="Pulihkan dari cadangan"
              sub="Pilih file cadangan yang pernah kamu unduh"
              onClick={() => document.getElementById("_imp")?.click()}
              busy={busy === "import"}
            />
            <input
              id="_imp"
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = "";
              }}
            />
          </label>
          <ActionRow
            emoji="🧹"
            label="Hapus catatan dari HP ini"
            sub="Misalnya sebelum ganti HP. Data di akunmu tetap aman."
            onClick={handleWipe}
            busy={busy === "wipe"}
            tone="warning"
          />
          <ActionRow
            emoji="🗑️"
            label="Hapus akun"
            sub="Menghapus akun dan semua catatan untuk selamanya"
            onClick={handleDelete}
            busy={busy === "delete"}
            tone="danger"
          />
        </Section>

        <Section
          title="Privasi kalian"
          description="Yang Twogether tidak pernah lakukan:"
        >
          <ul className="space-y-1.5 text-xs text-text-2">
            <li>• Tidak memasang pelacak atau iklan.</li>
            <li>• Tidak menyimpan password dalam bentuk yang bisa dibaca.</li>
            <li>• Tidak meminta izin yang tidak perlu.</li>
            <li>• Moment yang dikunci hanya bisa dibaca dengan password kamu.</li>
          </ul>
        </Section>
      </div>
      {toast && (
        <div
          className={`fixed bottom-[calc(80px+var(--sab))] left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2.5 text-[13px] font-medium shadow-lg transition-opacity ${
            toast.kind === "ok"
              ? "bg-[color:var(--positive-bg)] text-[color:var(--positive)]"
              : "bg-[color:var(--negative-bg)] text-[color:var(--negative)]"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">
        {title}
      </div>
      {description && <p className="mt-1 text-xs text-text-3">{description}</p>}
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function ActionRow({
  emoji,
  label,
  sub,
  onClick,
  busy,
  tone = "neutral",
}: {
  emoji: string;
  label: string;
  sub: string;
  onClick: () => void;
  busy: boolean;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-md bg-bg-elev2 px-3 py-2.5 text-left transition-colors active:bg-bg-elev3 disabled:opacity-50"
    >
      <span className="text-xl">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-semibold ${
            tone === "danger"
              ? "text-[color:var(--negative)]"
              : tone === "warning"
                ? "text-[color:var(--warning)]"
                : "text-text-1"
          }`}
        >
          {busy ? "Memproses…" : label}
        </div>
        <div className="text-[11px] text-text-3">{sub}</div>
      </div>
    </button>
  );
}
