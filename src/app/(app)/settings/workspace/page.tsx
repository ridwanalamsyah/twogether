"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth, loadWorkspaceContext } from "@/stores/auth";
import { useWorkspace, type WorkspaceMember } from "@/stores/workspace";
import { getSupabase, hasSupabase } from "@/lib/supabase";
import { getDB } from "@/lib/db";
import { clearSharedCopy, downloadExport, exportAll } from "@/services/privacy";

interface LocalCounts {
  transactions: number;
  goals: number;
  moments: number;
  habits: number;
}

async function countLocalData(userId: string): Promise<LocalCounts> {
  const db = getDB();
  const [transactions, goals, moments, habits] = await Promise.all([
    db.transactions
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .count(),
    db.goals
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .count(),
    db.moments
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .count(),
    db.habits
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt)
      .count(),
  ]);
  return { transactions, goals, moments, habits };
}

function describeCounts(c: LocalCounts): string {
  const parts: string[] = [];
  if (c.transactions) parts.push(`${c.transactions} transaksi`);
  if (c.goals) parts.push(`${c.goals} goals`);
  if (c.moments) parts.push(`${c.moments} momen`);
  if (c.habits) parts.push(`${c.habits} kebiasaan`);
  return parts.length === 0 ? "belum ada catatan" : parts.join(", ");
}

export default function WorkspaceSettingsPage() {
  const auth = useAuth();
  const workspaceName = useWorkspace((s) => s.workspaceName);
  const members = useWorkspace((s) => s.members);
  const sharedLabel = useWorkspace((s) => s.sharedLabel);
  const renameWorkspace = useWorkspace((s) => s.renameWorkspace);
  const upsertMember = useWorkspace((s) => s.upsertMember);
  const removeMember = useWorkspace((s) => s.removeMember);
  const [name, setName] = useState(workspaceName);
  const [showAdd, setShowAdd] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState<{
    pendingId: string;
    counts: LocalCounts;
  } | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);
  const [wipeCopy, setWipeCopy] = useState(false);
  const [backedUp, setBackedUp] = useState(false);

  const supaWorkspaceId = auth.supaWorkspaceId;
  const otherMembersCount = members.filter((m) => !m.isMe).length;

  async function actuallyJoin(id: string) {
    if (!hasSupabase()) {
      setJoinMsg("Fitur pasangan belum aktif di app ini");
      return;
    }
    setJoining(true);
    setJoinMsg(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Fitur pasangan belum aktif di app ini");
      const { error } = await sb.rpc("join_workspace", {
        ws: id,
        member_name: auth.name ?? "Anggota",
      });
      if (error) {
        if (error.code === "PGRST202" || /join_workspace/.test(error.message)) {
          throw new Error(
            "Fitur gabung belum siap. Coba lagi nanti.",
          );
        }
        if (/workspace_full/i.test(error.message)) {
          throw new Error("Ruang ini sudah berisi dua orang.");
        }
        if (/workspace_not_found/i.test(error.message)) {
          throw new Error("Kode tidak ditemukan. Cek lagi kodenya.");
        }
        throw new Error(error.message);
      }
      if (auth.supaUserId) {
        await sb
          .from("profiles")
          .upsert(
            { id: auth.supaUserId, active_workspace_id: id },
            { onConflict: "id" },
          );
        const fallback = {
          name: auth.name ?? "Anggota",
          email: auth.email,
          localId: auth.userId ?? id,
        };
        const ctx = await loadWorkspaceContext(auth.supaUserId, id, fallback);
        useAuth.setState({ supaWorkspaceId: id });
        useWorkspace.getState().setWorkspace({
          workspaceId: id,
          workspaceName: ctx.workspaceName,
          members: ctx.members,
        });
      }
      setJoinMsg("Berhasil tersambung! Memuat catatan kalian…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setJoinMsg(`${(err as Error).message}`);
    } finally {
      setJoining(false);
    }
  }

  async function handleJoinClick() {
    const id = joinId.trim();
    if (!id || !auth.userId) return;
    const counts = await countLocalData(auth.userId);
    setConfirmJoin({ pendingId: id, counts });
  }

  async function handleShareInvite() {
    if (!hasSupabase() || !supaWorkspaceId) return;
    setShareBusy(true);
    setShareMsg(null);
    setShareLink(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Fitur pasangan belum aktif di app ini");
      const { data, error } = await sb.rpc("create_workspace_invite", {
        p_workspace_id: supaWorkspaceId,
        p_expires_in_hours: 168,
      });
      if (error) {
        if (
          error.code === "PGRST202" ||
          /create_workspace_invite/.test(error.message)
        ) {
          throw new Error(
            "Link undangan belum bisa dibuat. Coba lagi nanti.",
          );
        }
        throw new Error(error.message);
      }
      const token = data as string;
      const link = `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
      setShareLink(link);
      // Try Web Share API first for native sheet.
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: "Gabung Twogether bareng aku",
            text: "Yuk pakai Twogether bareng, buka link ini:",
            url: link,
          });
          setShareMsg("Link sudah dibagikan.");
          return;
        }
      } catch {
        // User cancelled the share sheet — fall through to copy.
      }
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setShareMsg("Link sudah disalin. Tinggal paste di WA / chat.");
      setTimeout(() => setShareCopied(false), 2500);
    } catch (err) {
      setShareMsg(`${(err as Error).message}`);
    } finally {
      setShareBusy(false);
    }
  }

  async function handleLeave() {
    if (!hasSupabase() || !auth.supaUserId) return;
    setLeaving(true);
    setLeaveMsg(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Fitur pasangan belum aktif di app ini");
      const { data, error } = await sb.rpc("leave_workspace", { p_workspace_id: auth.supaWorkspaceId ?? null });
      if (error) {
        if (
          error.code === "PGRST202" ||
          /leave_workspace/.test(error.message)
        ) {
          throw new Error(
            "Belum bisa keluar sekarang. Coba lagi nanti.",
          );
        }
        throw new Error(error.message);
      }
      const newWorkspaceId = data as string;
      if (!newWorkspaceId) throw new Error("Gagal keluar. Coba lagi.");
      // Refresh local state.
      const ctx = await loadWorkspaceContext(auth.supaUserId, newWorkspaceId, {
        name: auth.name ?? "Anggota",
        email: auth.email,
        localId: auth.userId ?? newWorkspaceId,
      });
      useAuth.setState({ supaWorkspaceId: newWorkspaceId });
      useWorkspace.getState().setWorkspace({
        workspaceId: newWorkspaceId,
        workspaceName: ctx.workspaceName,
        members: ctx.members,
      });
      if (wipeCopy && auth.userId) await clearSharedCopy(auth.userId);
      setLeaveMsg("Berhasil keluar. Memuat ulang…");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setLeaveMsg(`${(err as Error).message}`);
    } finally {
      setLeaving(false);
    }
  }

  function copyId() {
    if (!supaWorkspaceId) return;
    navigator.clipboard.writeText(supaWorkspaceId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyShareLink() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  }

  return (
    <div className="animate-in">
      <AppHeader
        title="Pasangan"
        subtitle={`${members.length} anggota`}
      />

      <div className="px-5 pb-8">
        <label htmlFor="ws-name" className="mt-4 mb-2 block text-[12px] font-medium section-label text-text-4">
          Nama
        </label>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <input
            id="ws-name"
            className="min-h-[44px] flex-1 rounded bg-transparent px-1 text-[14px] text-text-1 focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] focus-visible:outline-offset-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Ruang ${auth.name ?? "kita"}`}
          />
          <button
            type="button"
            onClick={() => renameWorkspace(name.trim() || workspaceName)}
            className="min-h-[44px] rounded-md bg-accent px-3.5 py-2 text-[12px] font-medium text-accent-fg active:opacity-80"
          >
            Simpan
          </button>
        </div>

        {hasSupabase() && supaWorkspaceId && (
          <>
            <div className="mt-6 mb-2 text-[12px] font-medium section-label text-text-4">
              Undang pasangan
            </div>
            <div className="border-y border-border py-3">
              <button
                type="button"
                onClick={handleShareInvite}
                disabled={shareBusy}
                className="min-h-[44px] w-full rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
              >
                {shareBusy ? "Membuat link…" : "Buat link undangan"}
              </button>
              {shareLink && (
                <div className="mt-3 rounded-md border border-border bg-bg-elev1 p-3">
                  <div className="break-all font-mono text-[12px] text-text-2">
                    {shareLink}
                  </div>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="mt-2 min-h-[44px] rounded-md border border-border px-3 py-2 text-[12px] text-text-2 active:opacity-50"
                  >
                    {shareCopied ? "Tersalin" : "Salin lagi"}
                  </button>
                </div>
              )}
              {shareMsg && (
                <p className="mt-2 text-[12px] text-text-3">{shareMsg}</p>
              )}
              <p className="mt-3 text-[12px] text-text-4">
                Link berlaku 7 hari dan cuma bisa dipakai sekali. Pasanganmu
                tinggal buka link-nya lalu masuk agar langsung tersambung.
              </p>

              <details className="mt-4">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-[12px] text-text-4">
                  Atau pakai kode
                </summary>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 truncate font-mono text-[12px] text-text-2">
                    {supaWorkspaceId}
                  </div>
                  <button
                    type="button"
                    onClick={copyId}
                    className="min-h-[44px] rounded-md border border-border px-3 py-2 text-[12px] text-text-2 active:opacity-50"
                  >
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </details>
            </div>

            <label htmlFor="ws-join-id" className="mt-6 mb-2 block text-[12px] font-medium section-label text-text-4">
              Punya kode dari pasangan?
            </label>
            <div className="border-y border-border py-3">
              <input
                id="ws-join-id"
                className="min-h-[44px] w-full rounded bg-transparent px-1 font-mono text-[13px] text-text-1 focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] focus-visible:outline-offset-2"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Tempel kode dari pasanganmu"
              />
              <button
                type="button"
                onClick={handleJoinClick}
                disabled={joining || !joinId.trim()}
                className="mt-3 min-h-[44px] w-full rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
              >
                {joining ? "Menggabungkan…" : "Gabung"}
              </button>
              {joinMsg && (
                <p className="mt-2 text-[12px] text-text-3">{joinMsg}</p>
              )}
              <p className="mt-2 text-[12px] text-text-4">
                Lebih gampang: minta pasanganmu kirim link undangan.
              </p>
            </div>
          </>
        )}

        <div className="mt-6 mb-2 flex items-center justify-between">
          <div className="text-[12px] font-medium section-label text-text-4">
            Anggota
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="min-h-[44px] rounded-md bg-accent px-3.5 py-2 text-[12px] font-medium text-accent-fg active:opacity-80"
          >
            + Tambah
          </button>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              onRemove={() => removeMember(m.id)}
            />
          ))}
          {members.length === 0 && (
            <div className="py-5 text-center text-sm text-text-3">
              Belum ada anggota.
            </div>
          )}
        </div>

        <div className="mt-6 text-[12px] text-text-4">
          Kalau sudah berdua, pilihan <b>{sharedLabel}</b> muncul untuk
          pengeluaran bersama.
        </div>

        {hasSupabase() && supaWorkspaceId && otherMembersCount > 0 && (
          <>
            <div className="mt-8 mb-2 text-[12px] font-medium section-label text-text-4">
              Lainnya
            </div>
            <div className="border-y border-border py-3">
              <button
                type="button"
                onClick={() => setConfirmLeave(true)}
                disabled={leaving}
                className="min-h-[44px] w-full rounded-md border border-[color:var(--negative)] px-3 py-2 text-[13px] font-medium text-[color:var(--negative)] active:opacity-60 disabled:opacity-40"
              >
                {leaving ? "Memproses…" : "Keluar dari ruang berdua"}
              </button>
              <p className="mt-2 text-[12px] text-text-4">
                Kamu akan punya ruang sendiri lagi. Catatan bersama tetap aman
                untuk pasanganmu.
              </p>
              {leaveMsg && (
                <p className="mt-2 text-[12px] text-text-3">{leaveMsg}</p>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddMemberSheet
            key="ws-add-member"
            onSave={(m) => {
              upsertMember(m);
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {confirmJoin && (
          <ConfirmDialog
            key="ws-confirm-join"
            title="Gabung dengan pasangan?"
            body={
              <>
                <p>
                  Catatanmu (<b>{describeCounts(confirmJoin.counts)}</b>) akan
                  ikut digabung dan bisa dilihat pasanganmu.
                </p>
                <p className="mt-2">
                  Kalau ragu, unduh cadangan dulu di{" "}
                  <span className="font-medium">Pengaturan &gt; Data &amp; cadangan</span>.
                </p>
              </>
            }
            confirmLabel="Ya, gabung"
            cancelLabel="Batal"
            danger={false}
            onCancel={() => setConfirmJoin(null)}
            onConfirm={() => {
              const id = confirmJoin.pendingId;
              setConfirmJoin(null);
              void actuallyJoin(id);
            }}
          />
        )}

        {confirmLeave && (
          <ConfirmDialog
            key="ws-confirm-leave"
            title="Keluar dari ruang berdua?"
            body={
              <>
                <p>
                  Kamu akan keluar dari <b>{workspaceName}</b> dan mulai dengan
                  ruang sendiri yang kosong.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-text-3">
                  <li>
                    Semua catatan bersama, termasuk yang kamu tulis, tetap ada di
                    ruang lama dan masih bisa dilihat pasanganmu. Kalau ada yang
                    tidak ingin ditinggalkan, hapus dulu sebelum keluar.
                  </li>
                  <li>Pasanganmu tidak bisa melihat apa pun yang kamu catat setelah ini.</li>
                </ul>
                <button
                  type="button"
                  onClick={async () => {
                    if (!auth.userId) return;
                    await downloadExport(await exportAll(auth.userId));
                    setBackedUp(true);
                  }}
                  className="mt-3 min-h-[44px] w-full rounded-full bg-bg-elev2 px-3 py-2 text-[13px] font-semibold text-text-1 active:scale-[0.98]"
                >
                  {backedUp ? "Cadangan tersimpan" : "Simpan cadangan dulu"}
                </button>
                <label className="mt-3 flex min-h-[44px] items-start gap-2.5 text-[12px] text-text-2">
                  <input
                    type="checkbox"
                    checked={wipeCopy}
                    onChange={(e) => setWipeCopy(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--accent)]"
                  />
                  <span>
                    Hapus juga salinan catatan bersama dari HP ini. Kalau tidak
                    dicentang, salinannya tetap bisa kamu lihat di HP ini.
                  </span>
                </label>
              </>
            }
            confirmLabel="Ya, keluar"
            cancelLabel="Batal"
            danger
            onCancel={() => setConfirmLeave(false)}
            onConfirm={() => {
              setConfirmLeave(false);
              void handleLeave();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberRow({
  member,
  onRemove,
}: {
  member: WorkspaceMember;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white"
        style={{ background: member.color }}
      >
        {member.name[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-text-1">
          {member.name}
          {member.isMe && (
            <span className="ml-1.5 text-[12px] section-label text-text-4">
              kamu
            </span>
          )}
          {member.isOwner && !member.isMe && (
            <span className="ml-1.5 text-[12px] section-label text-text-4">
              pembuat
            </span>
          )}
          {member.pending && (
            <span className="ml-1.5 text-[12px] section-label text-text-4">
              menunggu
            </span>
          )}
        </div>
        {member.email && (
          <div className="truncate text-[12px] text-text-4">{member.email}</div>
        )}
      </div>
      {!member.isMe && !member.isOwner && (
        <button
          type="button"
          onClick={onRemove}
          className="min-h-[44px] px-2 text-[12px] font-medium text-[color:var(--negative)] active:opacity-50"
        >
          Hapus
        </button>
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.button
        type="button"
        aria-label="Tutup dialog"
        onClick={onCancel}
        initial={reduced ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="backdrop-in fixed inset-0 bg-black/40"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduced ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-bg-app p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-[16px] font-semibold text-text-1">{title}</h2>
        <div className="mt-2 space-y-1 text-[13px] text-text-2">{body}</div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-md border border-border px-3 py-2 text-[13px] text-text-2 active:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] flex-1 rounded-md px-3 py-2 text-[13px] font-medium active:opacity-80 ${
              danger
                ? "bg-[color:var(--negative)] text-[color:var(--negative-fg)]"
                : "bg-accent text-accent-fg"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddMemberSheet({
  onSave,
  onClose,
}: {
  onSave: (m: WorkspaceMember) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: `pending:${Date.now().toString(36)}`,
      name: trimmed,
      email: email.trim() || undefined,
      color: pickColor(trimmed),
      isMe: false,
      isOwner: false,
      pending: true,
    });
  }

  return (
    <Sheet
      title="Tambah anggota"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-md border border-border px-3 py-2 text-[13px] text-text-2 active:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="min-h-[44px] flex-1 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
          >
            Simpan
          </button>
        </div>
      }
    >
      <p className="mb-4 text-[12px] text-text-4">
        Anggota lokal (tanpa akun) muncul di list buat tagging transaksi
        bersama. Untuk anggota dengan akun, pakai Buat link undangan.
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="ws-add-name" className="mb-1 block text-[12px] text-text-4">
            Nama
          </label>
          <input
            id="ws-add-name"
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama anggota"
          />
        </div>
        <div>
          <label htmlFor="ws-add-email" className="mb-1 block text-[12px] text-text-4">
            Email (opsional)
          </label>
          <input
            id="ws-add-email"
            className="input-base"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="opsional"
          />
        </div>
      </div>
    </Sheet>
  );
}

const PALETTE = [
  "var(--tint-stone)",
  "var(--tint-cobalt)",
  "var(--tint-iris)",
  "var(--tint-forest)",
  "var(--tint-bronze)",
  "var(--tint-crimson)",
];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
