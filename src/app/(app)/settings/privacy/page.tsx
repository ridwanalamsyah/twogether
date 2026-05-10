"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  deleteAccount,
  downloadExport,
  downloadCsv,
  exportAll,
  exportTransactionsCsv,
  importBundle,
  wipeLocal,
} from "@/services/privacy";
import { isUnlocked } from "@/lib/crypto";

export default function PrivacyPage() {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const signOut = useAuth((s) => s.signOut);
  const [busy, setBusy] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setUnlocked(isUnlocked());
  }, []);

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
      const { imported, tables } = await importBundle(userId, json);
      showToast(
        "ok",
        `${imported} catatan dari ${tables.length} tabel berhasil dipulihkan.`,
      );
    } catch (err) {
      showToast("err", `Import gagal. ${(err as Error).message}`);
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

  async function handleWipe() {
    if (!userId) return;
    if (!confirm("Hapus semua data dari device ini? Server tidak terpengaruh.")) return;
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
        "Hapus akun? Semua data akan ditandai untuk dihapus dari server saat online. Tindakan ini tidak bisa dibatalkan.",
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
        title="Privacy"
        subtitle="Kontrol penuh atas data kamu"
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
        <Section title="Status keamanan">
          <Row
            label="Enkripsi end-to-end"
            value={unlocked ? "🔓 Terbuka di sesi ini" : "🔒 Terkunci"}
          />
          <Row label="Penyimpanan" value="Lokal (IndexedDB)" />
          <Row label="Transport" value="HTTPS / TLS" />
          <Row label="Analytics" value="Anonim & opt-in" />
        </Section>

        <Section
          title="Data ownership"
          description="Kamu pemilik datanya. Twogether tidak menyimpan apa pun di luar device tanpa sync eksplisit kamu."
        >
          <ActionRow
            emoji="⬇️"
            label="Export semua data (JSON)"
            sub="Bundle lengkap (transaksi, goal, moments, skripsi, dst.)"
            onClick={handleExport}
            busy={busy === "export"}
          />
          <ActionRow
            emoji="📄"
            label="Export transaksi (CSV)"
            sub="Buat buka di Numbers / Excel / Google Sheets"
            onClick={handleCsvExport}
            busy={busy === "csv"}
          />
          <label className="block">
            <ActionRow
              emoji="⬆️"
              label="Import dari file JSON"
              sub="Restore backup atau migrasi dari device lain."
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
            label="Hapus data dari device ini"
            sub="Cloud copy tetap aman. Untuk lepas device dari workspace."
            onClick={handleWipe}
            busy={busy === "wipe"}
            tone="warning"
          />
          <ActionRow
            emoji="🗑️"
            label="Hapus akun permanen"
            sub="Tombstone semua data; sync queue propagasi ke server."
            onClick={handleDelete}
            busy={busy === "delete"}
            tone="danger"
          />
        </Section>

        <Section
          title="Privacy by default"
          description="Apa yang Twogether TIDAK lakukan:"
        >
          <ul className="space-y-1.5 text-xs text-text-2">
            <li>• Tidak mengumpulkan tracker pihak ketiga.</li>
            <li>• Tidak menyimpan password plaintext (PBKDF2 SHA-256, 210k iter).</li>
            <li>• Tidak meminta izin yang tidak relevan.</li>
            <li>• Tidak mengirim catatan terenkripsi dalam bentuk plaintext.</li>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-bg-elev2 px-3 py-2 theme-transition">
      <span className="text-xs text-text-3">{label}</span>
      <span className="text-xs font-semibold text-text-1">{value}</span>
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
