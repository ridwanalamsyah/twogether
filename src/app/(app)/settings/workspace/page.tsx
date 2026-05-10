"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { useWorkspace, type WorkspaceMember } from "@/stores/workspace";
import { getSupabase, hasSupabase } from "@/lib/supabase";

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

  const supaWorkspaceId = auth.supaWorkspaceId;

  async function handleJoin() {
    if (!hasSupabase()) {
      setJoinMsg("Backend Supabase belum aktif");
      return;
    }
    const id = joinId.trim();
    if (!id) return;
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
      // Set this as the active workspace for the user.
      if (auth.supaUserId) {
        await sb
          .from("profiles")
          .upsert(
            { id: auth.supaUserId, active_workspace_id: id },
            { onConflict: "id" },
          );
      }
      setJoinMsg("Berhasil! Memuat ulang data workspace…");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setJoinMsg(`${(err as Error).message}`);
    } finally {
      setJoining(false);
    }
  }

  function copyId() {
    if (!supaWorkspaceId) return;
    navigator.clipboard.writeText(supaWorkspaceId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <div className="text-[11px] text-text-4">Workspace ID</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 truncate font-mono text-[12px] text-text-1">
                  {supaWorkspaceId}
                </div>
                <button
                  onClick={copyId}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-text-2 active:opacity-50"
                >
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-text-4">
                Kirim ID ini ke partner. Mereka login dengan akun masing-masing,
                lalu paste di kolom &quot;Gabung workspace&quot; di bawah.
              </p>
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
                onClick={handleJoin}
                disabled={joining || !joinId.trim()}
                className="mt-3 w-full rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
              >
                {joining ? "Menggabungkan…" : "Gabung"}
              </button>
              {joinMsg && (
                <p className="mt-2 text-[11px] text-text-3">{joinMsg}</p>
              )}
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
              owner
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
      pending: true,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(96px+var(--sab))] slide-up theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Tambah anggota</h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Nama
            </div>
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: Alya"
              autoFocus
            />
          </label>
          <label className="block">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-4">
              Email (opsional)
            </div>
            <input
              className="input-base"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alya@contoh.id"
            />
          </label>
          <p className="text-[11px] text-text-4">
            Untuk sync lintas device, partner harus sign up sendiri lalu join
            workspace pakai Workspace ID di atas.
          </p>
          <button
            onClick={submit}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-accent-fg active:opacity-80"
          >
            Tambahkan
          </button>
        </div>
      </div>
    </div>
  );
}
