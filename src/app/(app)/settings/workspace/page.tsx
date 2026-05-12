"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth, loadWorkspaceContext } from "@/stores/auth";
import { useWorkspace, type WorkspaceMember } from "@/stores/workspace";
import { getSupabase, hasSupabase } from "@/lib/supabase";
import { getDB } from "@/lib/db";

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
  return parts.length === 0 ? "tidak ada data lokal" : parts.join(", ");
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

  const supaWorkspaceId = auth.supaWorkspaceId;
  const otherMembersCount = members.filter((m) => !m.isMe).length;

  async function actuallyJoin(id: string) {
    if (!hasSupabase()) {
      setJoinMsg("Backend Supabase belum aktif");
      return;
    }
    setJoining(true);
    setJoinMsg(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Backend belum aktif");
      const { error } = await sb.rpc("join_workspace", {
        ws: id,
        member_name: auth.name ?? "Anggota",
      });
      if (error) {
        if (error.code === "PGRST202" || /join_workspace/.test(error.message)) {
          throw new Error(
            "Fitur join workspace belum di-setup. Hubungi admin untuk run migration.",
          );
        }
        if (/workspace_not_found/i.test(error.message)) {
          throw new Error("Workspace ID tidak ditemukan. Pastikan ID benar.");
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
      setJoinMsg("Berhasil! Memuat ulang data workspace…");
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
      if (!sb) throw new Error("Backend belum aktif");
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
            "Fitur invite link belum aktif. Admin perlu jalankan migration 0005.",
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
            title: "Twogether — Gabung workspace",
            text: "Ayo gabung workspace di Twogether",
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
      if (!sb) throw new Error("Backend belum aktif");
      const { data, error } = await sb.rpc("leave_workspace");
      if (error) {
        if (
          error.code === "PGRST202" ||
          /leave_workspace/.test(error.message)
        ) {
          throw new Error(
            "Fitur keluar workspace belum aktif. Admin perlu jalankan migration 0005.",
          );
        }
        throw new Error(error.message);
      }
      const newWorkspaceId = data as string;
      if (!newWorkspaceId) throw new Error("Workspace baru tidak terbentuk");
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
        title="Workspace"
        subtitle={`${members.length} anggota`}
        actions={
          <Link
            href="/settings"
            className="text-[12px] text-text-3 active:opacity-50"
          >
            Kembali
          </Link>
        }
      />

      <div className="px-5 pb-8">
        <div className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
          Nama
        </div>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <input
            className="flex-1 bg-transparent text-[14px] text-text-1 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Workspace ${auth.name ?? ""}`}
          />
          <button
            onClick={() => renameWorkspace(name.trim() || workspaceName)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg active:opacity-80"
          >
            Simpan
          </button>
        </div>

        {hasSupabase() && supaWorkspaceId && (
          <>
            <div className="mt-6 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Bagikan ke partner
            </div>
            <div className="border-y border-border py-3">
              <button
                onClick={handleShareInvite}
                disabled={shareBusy}
                className="w-full rounded-md bg-accent px-3 py-2 text-[12px] font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
              >
                {shareBusy ? "Membuat link…" : "Buat link undangan"}
              </button>
              {shareLink && (
                <div className="mt-3 rounded-md border border-border bg-bg-elev1 p-3">
                  <div className="break-all font-mono text-[11px] text-text-2">
                    {shareLink}
                  </div>
                  <button
                    onClick={copyShareLink}
                    className="mt-2 rounded-md border border-border px-2.5 py-1 text-[11px] text-text-2 active:opacity-50"
                  >
                    {shareCopied ? "Tersalin" : "Salin lagi"}
                  </button>
                </div>
              )}
              {shareMsg && (
                <p className="mt-2 text-[11px] text-text-3">{shareMsg}</p>
              )}
              <p className="mt-3 text-[11px] text-text-4">
                Link berlaku 7 hari, satu kali pakai. Partner tinggal klik link
                lalu login — workspace langsung tersambung.
              </p>

              <details className="mt-4">
                <summary className="cursor-pointer text-[11px] text-text-4">
                  Atau pakai ID workspace manual
                </summary>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 truncate font-mono text-[11px] text-text-2">
                    {supaWorkspaceId}
                  </div>
                  <button
                    onClick={copyId}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] text-text-2 active:opacity-50"
                  >
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </details>
            </div>

            <div className="mt-6 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Gabung workspace
            </div>
            <div className="border-y border-border py-3">
              <input
                className="w-full bg-transparent text-[12px] font-mono text-text-1 outline-none"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste workspace ID dari partner"
              />
              <button
                onClick={handleJoinClick}
                disabled={joining || !joinId.trim()}
                className="mt-3 w-full rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
              >
                {joining ? "Menggabungkan…" : "Gabung"}
              </button>
              {joinMsg && (
                <p className="mt-2 text-[11px] text-text-3">{joinMsg}</p>
              )}
              <p className="mt-2 text-[11px] text-text-4">
                Tip: lebih enak pakai &quot;Buat link undangan&quot; di atas —
                gak perlu paste UUID panjang.
              </p>
            </div>
          </>
        )}

        <div className="mt-6 mb-2 flex items-end justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-text-4">
            Anggota
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg active:opacity-80"
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

        <div className="mt-6 text-[11px] text-text-4">
          Pseudo-member <span className="font-mono">{sharedLabel}</span> otomatis
          tersedia untuk pengeluaran bersama ketika anggota ≥ 2.
        </div>

        {hasSupabase() && supaWorkspaceId && otherMembersCount > 0 && (
          <>
            <div className="mt-8 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Zona berbahaya
            </div>
            <div className="border-y border-border py-3">
              <button
                onClick={() => setConfirmLeave(true)}
                disabled={leaving}
                className="w-full rounded-md border border-[color:var(--negative)] px-3 py-2 text-[12px] font-medium text-[color:var(--negative)] active:opacity-60 disabled:opacity-40"
              >
                {leaving ? "Memproses…" : "Keluar dari workspace"}
              </button>
              <p className="mt-2 text-[11px] text-text-4">
                Kamu akan otomatis dapat workspace solo baru. Data di workspace
                bersama tetap aman buat partner.
              </p>
              {leaveMsg && (
                <p className="mt-2 text-[11px] text-text-3">{leaveMsg}</p>
              )}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <AddMemberSheet
          onSave={(m) => {
            upsertMember(m);
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {confirmJoin && (
        <ConfirmDialog
          title="Gabung workspace partner?"
          body={
            <>
              <p>
                Data lokal kamu (<b>{describeCounts(confirmJoin.counts)}</b>)
                akan otomatis ikut ter-sync ke workspace partner saat kamu join.
              </p>
              <p className="mt-2">
                Pastikan ini yang kamu mau. Kalau ragu, backup dulu via{" "}
                <span className="font-medium">Settings → Privacy</span> sebelum
                lanjut.
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
          title="Keluar dari workspace?"
          body={
            <>
              <p>
                Kamu akan keluar dari <b>{workspaceName}</b> dan otomatis dapat
                workspace solo baru.
              </p>
              <p className="mt-2 text-[12px] text-text-4">
                Data di workspace bersama tetap utuh — partner masih bisa pakai
                seperti biasa. Kamu cuma kehilangan akses ke workspace ini dari
                akunmu.
              </p>
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
        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium text-white"
        style={{ background: member.color }}
      >
        {member.name[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-text-1">
          {member.name}
          {member.isMe && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-text-4">
              kamu
            </span>
          )}
          {member.isOwner && !member.isMe && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-text-4">
              pembuat
            </span>
          )}
          {member.pending && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-text-4">
              menunggu
            </span>
          )}
        </div>
        {member.email && (
          <div className="truncate text-[11px] text-text-4">{member.email}</div>
        )}
      </div>
      {!member.isMe && !member.isOwner && (
        <button
          onClick={onRemove}
          className="text-[11px] text-[color:var(--negative)] active:opacity-50"
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
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-bg-app p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-semibold text-text-1">{title}</h2>
        <div className="mt-2 space-y-1 text-[13px] text-text-2">{body}</div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-border px-3 py-2 text-[13px] text-text-2 active:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-md px-3 py-2 text-[13px] font-medium active:opacity-80 ${
              danger
                ? "bg-[color:var(--negative)] text-white"
                : "bg-accent text-accent-fg"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-bg-app p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-semibold text-text-1">
          Tambah anggota
        </h2>
        <p className="mt-1 text-[12px] text-text-4">
          Anggota lokal (tanpa akun) muncul di list buat tagging transaksi
          bersama. Untuk anggota dengan akun, pakai &quot;Buat link
          undangan&quot;.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 text-[11px] text-text-4">Nama</div>
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama anggota"
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] text-text-4">Email (opsional)</div>
            <input
              className="input-base"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="opsional"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-3 py-2 text-[13px] text-text-2 active:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex-1 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

const PALETTE = [
  "#0d0d0d",
  "#2563eb",
  "#7c3aed",
  "#16a34a",
  "#ea580c",
  "#db2777",
];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
