"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, loadWorkspaceContext } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { getSupabase, hasSupabase } from "@/lib/supabase";

const PENDING_INVITE_KEY = "twogether:pending-invite";

/**
 * Workspace invite landing page.
 *
 * URL pattern: `/join?token=<short-token>`
 *
 * Behavior:
 *  - Token missing → show error.
 *  - Not logged in → stash token in sessionStorage and redirect to /auth.
 *    /auth checks for the pending invite after a successful sign-in and
 *    redirects back here to finish consuming the invite.
 *  - Logged in → call `consume_workspace_invite` RPC, then update local
 *    auth + workspace stores to reflect the partner's workspace, then
 *    reload into /home with the right context.
 */
export default function JoinPage() {
  const router = useRouter();
  const auth = useAuth();
  const [status, setStatus] = useState<"idle" | "joining" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const url = new URL(window.location.href);
      const token =
        url.searchParams.get("token") ||
        sessionStorage.getItem(PENDING_INVITE_KEY);
      if (!token) {
        setError("Link invite tidak punya token.");
        setStatus("error");
        return;
      }
      if (!auth.userId || !auth.supaUserId) {
        // Defer the consume until after sign-in.
        sessionStorage.setItem(PENDING_INVITE_KEY, token);
        router.replace("/auth");
        return;
      }
      if (!hasSupabase()) {
        setError("Backend Supabase belum aktif.");
        setStatus("error");
        return;
      }
      setStatus("joining");
      try {
        const sb = getSupabase();
        if (!sb) throw new Error("Backend belum aktif");
        const { data, error: rpcError } = await sb.rpc(
          "consume_workspace_invite",
          {
            p_token: token,
            p_member_name: auth.name ?? "Anggota",
          },
        );
        if (rpcError) {
          if (
            rpcError.code === "PGRST202" ||
            /consume_workspace_invite/.test(rpcError.message)
          ) {
            throw new Error(
              "Fitur invite link belum aktif. Admin perlu jalankan migration 0005.",
            );
          }
          if (/invite_not_found/.test(rpcError.message)) {
            throw new Error("Link sudah tidak berlaku atau salah ketik.");
          }
          if (/invite_expired/.test(rpcError.message)) {
            throw new Error("Link sudah expired. Minta partner kamu buat baru.");
          }
          if (/invite_already_used/.test(rpcError.message)) {
            throw new Error(
              "Link sudah dipakai user lain. Minta partner kamu buat baru.",
            );
          }
          throw new Error(rpcError.message);
        }
        const workspaceId = data as string;
        if (!workspaceId) throw new Error("Workspace ID tidak diterima.");
        sessionStorage.removeItem(PENDING_INVITE_KEY);

        // Hydrate local stores immediately so /home lands on the right
        // workspace without a full reload race.
        const ctx = await loadWorkspaceContext(auth.supaUserId, workspaceId, {
          name: auth.name ?? "Anggota",
          email: auth.email,
          localId: auth.userId ?? workspaceId,
        });
        useAuth.setState({ supaWorkspaceId: workspaceId });
        useWorkspace.getState().setWorkspace({
          workspaceId,
          workspaceName: ctx.workspaceName,
          members: ctx.members,
        });

        if (cancelled) return;
        setStatus("done");
        // Hard reload via window.location so SyncProvider re-bootstraps
        // against the new workspace.
        setTimeout(() => window.location.replace("/home"), 800);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
        setStatus("error");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [auth.userId, auth.supaUserId, auth.name, auth.email, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-app px-7 pt-safe theme-transition">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-accent text-accent-fg">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <circle cx="9" cy="12" r="5" />
            <circle cx="15" cy="12" r="5" />
          </svg>
        </div>
        {status === "idle" && (
          <div className="text-sm text-text-3">Menyiapkan invite…</div>
        )}
        {status === "joining" && (
          <>
            <h1 className="text-[22px] font-semibold text-text-1">
              Sedang menggabungkan…
            </h1>
            <p className="text-[13px] text-text-3">
              Tunggu sebentar, kami lagi nyambungin akun kamu ke workspace
              partner.
            </p>
          </>
        )}
        {status === "done" && (
          <>
            <h1 className="text-[22px] font-semibold text-text-1">
              Berhasil bergabung!
            </h1>
            <p className="text-[13px] text-text-3">
              Sebentar lagi kamu masuk ke workspace bersama.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-[22px] font-semibold text-text-1">
              Gabung gagal
            </h1>
            <p className="text-[13px] text-text-3">{error}</p>
            <button
              onClick={() => router.replace("/home")}
              className="mt-2 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg active:opacity-80"
            >
              Kembali
            </button>
          </>
        )}
      </div>
    </main>
  );
}
