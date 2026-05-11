"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getDB, newId, now, type UserRecord } from "@/lib/db";
import { generateSalt, hashPassword, lockKey, unlockKey } from "@/lib/crypto";
import { useWorkspace } from "@/stores/workspace";
import { seedSampleData } from "@/services/seed";
import { getSupabase, hasSupabase } from "@/lib/supabase";
import { sync } from "@/services/sync";
import { pullWorkspace, subscribeRealtime } from "@/services/supaSync";
import type { WorkspaceMember } from "@/stores/workspace";

interface AuthState {
  userId: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  /** Supabase auth user UUID, when wired. */
  supaUserId: string | null;
  /** Supabase workspace UUID, when wired. */
  supaWorkspaceId: string | null;
  ready: boolean;
  bootstrap: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<UserRecord, "name" | "birthday" | "avatar">>,
  ) => Promise<void>;
}

export interface SignUpInput {
  email: string;
  password: string;
  /** When true, populate the new workspace with example data (default true). */
  seed?: boolean;
  name: string;
  birthday?: string;
}

let realtimeUnsub: (() => void) | null = null;

async function attachSupa(
  supaUserId: string,
  supaWorkspaceId: string,
  localUserId: string,
): Promise<void> {
  sync.setSupaContext({
    workspaceId: supaWorkspaceId,
    authUserId: supaUserId,
    localUserId,
  });
  try {
    await pullWorkspace({
      workspaceId: supaWorkspaceId,
      authUserId: supaUserId,
      localUserId,
    });
  } catch (err) {
    console.warn("[supa] pull failed:", err);
  }
  if (realtimeUnsub) realtimeUnsub();
  realtimeUnsub = subscribeRealtime({
    workspaceId: supaWorkspaceId,
    authUserId: supaUserId,
    localUserId,
  });
}

function detachSupa(): void {
  sync.setSupaContext(null);
  if (realtimeUnsub) {
    realtimeUnsub();
    realtimeUnsub = null;
  }
}

/**
 * Ensures a workspace exists for this Supabase user (idempotent).
 * Returns the workspace UUID.
 */
async function ensureSupaWorkspace(
  supaUserId: string,
  name: string,
): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("supabase_unavailable");
  // Prefer profile.active_workspace_id if set & user is a member of it.
  const { data: profile } = await sb
    .from("profiles")
    .select("active_workspace_id")
    .eq("id", supaUserId)
    .maybeSingle();
  if (profile?.active_workspace_id) {
    const { data: ms } = await sb
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", supaUserId)
      .eq("workspace_id", profile.active_workspace_id)
      .limit(1);
    if (ms && ms.length > 0) return profile.active_workspace_id as string;
    // Stale pointer — fall through to recover.
  }
  // Otherwise pick the first workspace the user is a member of.
  const { data: existing, error: e1 } = await sb
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", supaUserId)
    .limit(1);
  if (e1) throw new Error(e1.message);
  if (existing && existing.length > 0) {
    const wsId = existing[0].workspace_id as string;
    // Best-effort: realign active_workspace_id so future bootstraps are fast.
    void sb
      .from("profiles")
      .upsert({ id: supaUserId, active_workspace_id: wsId }, { onConflict: "id" });
    return wsId;
  }
  // Create workspace + member row
  const { data: ws, error: e2 } = await sb
    .from("workspaces")
    .insert({ name: `Workspace ${name}`, owner_id: supaUserId })
    .select("id")
    .single();
  if (e2 || !ws) throw new Error(e2?.message ?? "workspace_create_failed");
  const wsId = ws.id as string;
  const { error: e3 } = await sb.from("workspace_members").insert({
    workspace_id: wsId,
    user_id: supaUserId,
    member_name: name,
    role: "owner",
  });
  if (e3) throw new Error(e3.message);
  await sb
    .from("profiles")
    .upsert({ id: supaUserId, active_workspace_id: wsId }, { onConflict: "id" });
  return wsId;
}

/**
 * Load the canonical workspace name + member roster from Supabase. Used after
 * sign-in or join so the local UI reflects the *real* workspace (e.g. a
 * workspace owned by a partner), not a synthesized `Workspace ${me.name}`.
 */
export async function loadWorkspaceContext(
  supaUserId: string,
  workspaceId: string,
  fallback: { name: string; email: string | null; localId: string },
): Promise<{ workspaceName: string; members: WorkspaceMember[] }> {
  const sb = getSupabase();
  if (!sb) {
    return {
      workspaceName: `Workspace ${fallback.name}`,
      members: [
        {
          id: fallback.localId,
          name: fallback.name,
          email: fallback.email ?? undefined,
          isMe: true,
          isOwner: true,
        },
      ],
    };
  }
  const [wsRes, wmRes] = await Promise.all([
    sb
      .from("workspaces")
      .select("name, owner_id")
      .eq("id", workspaceId)
      .maybeSingle(),
    sb
      .from("workspace_members")
      .select("user_id, member_name, role")
      .eq("workspace_id", workspaceId),
  ]);
  const ws = wsRes.data;
  const wmRows = wmRes.data ?? [];
  const workspaceName = ws?.name ?? `Workspace ${fallback.name}`;
  const ownerId = (ws?.owner_id ?? null) as string | null;

  // Fetch profiles in one shot so we can show display names instead of the
  // (often terse) `member_name` users set on join.
  let profilesByUserId: Record<string, { name?: string | null }> = {};
  if (wmRows.length > 0) {
    const ids = wmRows.map((r) => r.user_id as string);
    const { data: profs } = await sb
      .from("profiles")
      .select("id, name")
      .in("id", ids);
    profilesByUserId = Object.fromEntries(
      (profs ?? []).map((p) => [p.id as string, { name: p.name as string | null }]),
    );
  }

  const members: WorkspaceMember[] = wmRows.map((row) => {
    const uid = row.user_id as string;
    const isSelf = uid === supaUserId;
    const profName = profilesByUserId[uid]?.name ?? null;
    const displayName = profName || (row.member_name as string) || "Anggota";
    return {
      id: isSelf ? fallback.localId : uid,
      name: displayName,
      email: isSelf ? fallback.email ?? undefined : undefined,
      isMe: isSelf,
      isOwner: row.role === "owner" || uid === ownerId,
    };
  });

  // Self-heal: if the current user isn't represented yet (race after
  // join_workspace), splice them in so the UI doesn't look empty.
  if (!members.some((m) => m.isMe)) {
    members.push({
      id: fallback.localId,
      name: fallback.name,
      email: fallback.email ?? undefined,
      isMe: true,
      isOwner: ownerId === supaUserId,
    });
  }

  return { workspaceName, members };
}

/**
 * Reconcile the local stores with the workspace that Supabase currently says
 * is active for this user. Idempotent — safe to call from bootstrap, signIn,
 * signUp, and after `join_workspace`. Replaces the prior pattern that wrote
 * `Workspace ${me.name}` on every reconcile, which clobbered the partner's
 * workspace name after a successful join.
 */
export async function reconcileSupaWorkspace(
  supaUserId: string,
  fallback: { name: string; email: string | null; localId: string },
): Promise<string> {
  const workspaceId = await ensureSupaWorkspace(supaUserId, fallback.name);
  const { workspaceName, members } = await loadWorkspaceContext(
    supaUserId,
    workspaceId,
    fallback,
  );
  useWorkspace.getState().setWorkspace({
    workspaceId,
    workspaceName,
    members,
  });
  return workspaceId;
}

async function ensureSupaProfile(
  supaUserId: string,
  patch: { name?: string; birthday?: string; avatar?: string },
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from("profiles")
    .upsert({ id: supaUserId, ...patch }, { onConflict: "id" });
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,
      name: null,
      avatar: null,
      supaUserId: null,
      supaWorkspaceId: null,
      ready: false,

      bootstrap: async () => {
        try {
          // Try to recover Supabase session first.
          if (hasSupabase()) {
            const sb = getSupabase();
            if (sb) {
              const { data } = await sb.auth.getSession();
              const session = data.session;
              if (session?.user) {
                const supaUserId = session.user.id;
                const email = session.user.email ?? "";
                let { userId, name } = get();
                let user = userId ? await getDB().users.get(userId) : null;
                if (!user) {
                  // First-run on this device: try fetch profile
                  const { data: profile } = await sb
                    .from("profiles")
                    .select("name, birthday, avatar")
                    .eq("id", supaUserId)
                    .maybeSingle();
                  const localId = userId ?? newId();
                  user = {
                    id: localId,
                    userId: localId,
                    email,
                    name: profile?.name ?? name ?? email.split("@")[0],
                    birthday: profile?.birthday ?? undefined,
                    avatar: profile?.avatar ?? undefined,
                    createdAt: now(),
                    updatedAt: now(),
                    dirty: 0,
                  } as UserRecord;
                  await getDB().users.put(user);
                  userId = localId;
                  name = user.name;
                }
                // Always reconcile from server so a stale persisted
                // workspaceId (e.g. after the user joined a partner's
                // workspace and reloaded) doesn't pin the UI to a dead
                // pointer.
                const supaWorkspaceId = await reconcileSupaWorkspace(
                  supaUserId,
                  { name: user.name, email, localId: userId! },
                );
                set({
                  userId,
                  email,
                  name: user.name,
                  avatar: user.avatar ?? null,
                  supaUserId,
                  supaWorkspaceId,
                  ready: true,
                });
                await attachSupa(supaUserId, supaWorkspaceId, userId!);
                return;
              }
            }
          }

          // No Supabase session — fall back to local-only.
          const { userId } = get();
          if (!userId) {
            set({ ready: true });
            return;
          }
          const db = getDB();
          const user = await db.users.get(userId);
          if (user && !user.deletedAt) {
            set({
              userId: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar ?? null,
              ready: true,
            });
            const ws = useWorkspace.getState();
            if (!ws.workspaceId || ws.members.length === 0) {
              ws.setWorkspace({
                workspaceId: `ws_${user.id}`,
                workspaceName: `Workspace ${user.name}`,
                members: [
                  {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    isMe: true,
                    isOwner: true,
                  },
                ],
              });
            } else {
              ws.upsertMember({
                id: user.id,
                name: user.name,
                email: user.email,
                isMe: true,
              });
            }
          } else {
            set({ userId: null, email: null, name: null, ready: true });
          }
        } catch (err) {
          console.warn("[auth] bootstrap failed:", err);
          set({ ready: true });
        }
      },

      signUp: async ({ email, password, name, birthday, seed = true }) => {
        if (hasSupabase()) {
          const sb = getSupabase();
          if (!sb) throw new Error("supabase_unavailable");
          const { data, error } = await sb.auth.signUp({ email, password });
          if (error) throw new Error(translateAuthError(error.message));
          const supaUserId = data.user?.id;
          if (!supaUserId) {
            throw new Error(
              "Cek email kamu untuk konfirmasi, lalu coba login.",
            );
          }
          // If session is null but user returned, email confirmation is on;
          // best to advise the user. For now, we still create profile/workspace
          // assuming auto-confirm or developer setting.
          if (!data.session) {
            // Try to sign in immediately (works if email confirmation is off).
            const { error: signinErr } = await sb.auth.signInWithPassword({
              email,
              password,
            });
            if (signinErr) {
              throw new Error(
                "Kami kirim email konfirmasi. Klik link di email lalu coba login.",
              );
            }
          }
          await ensureSupaProfile(supaUserId, { name, birthday, avatar: undefined });

          const db = getDB();
          const localId = newId();
          const user: UserRecord = {
            id: localId,
            userId: localId,
            email,
            name,
            birthday,
            createdAt: now(),
            updatedAt: now(),
            dirty: 0,
          };
          await db.users.put(user);
          const supaWorkspaceId = await reconcileSupaWorkspace(supaUserId, {
            name,
            email,
            localId,
          });
          set({
            userId: localId,
            email,
            name,
            supaUserId,
            supaWorkspaceId,
            ready: true,
          });
          await attachSupa(supaUserId, supaWorkspaceId, localId);
          if (seed) {
            try {
              await seedSampleData({ userId: localId, primaryWho: name });
            } catch (err) {
              console.warn("[auth] seed failed:", err);
            }
          }
          return;
        }

        // Local-only fallback (no Supabase env)
        const db = getDB();
        const existing = await db.users.where("email").equals(email).first();
        if (existing && !existing.deletedAt) {
          throw new Error("Email sudah terdaftar");
        }
        const salt = generateSalt();
        const hash = await hashPassword(password, salt);
        const id = newId();
        const user: UserRecord & { passwordHash: string } = {
          id,
          userId: id,
          email,
          name,
          birthday,
          encSalt: salt,
          createdAt: now(),
          updatedAt: now(),
          dirty: 1,
          passwordHash: hash,
        } as UserRecord & { passwordHash: string };
        await db.users.put(user);
        await unlockKey(password, salt);
        set({ userId: id, email, name, ready: true });
        useWorkspace.getState().setWorkspace({
          workspaceId: `ws_${id}`,
          workspaceName: `Workspace ${name}`,
          members: [{ id, name, email, isMe: true, isOwner: true }],
        });
        if (seed) {
          try {
            await seedSampleData({ userId: id, primaryWho: name });
          } catch (err) {
            console.warn("[auth] seed failed:", err);
          }
        }
      },

      signIn: async (email, password) => {
        if (hasSupabase()) {
          const sb = getSupabase();
          if (!sb) throw new Error("supabase_unavailable");
          const { data, error } = await sb.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw new Error(translateAuthError(error.message));
          const supaUserId = data.user?.id;
          if (!supaUserId) throw new Error("Login gagal");

          // Load profile
          const { data: profile } = await sb
            .from("profiles")
            .select("name, birthday, avatar")
            .eq("id", supaUserId)
            .maybeSingle();
          const profileName = profile?.name ?? email.split("@")[0];

          const db = getDB();
          // Reuse existing local user row if present, else create.
          let user = await db.users.where("email").equals(email).first();
          if (!user) {
            const localId = newId();
            user = {
              id: localId,
              userId: localId,
              email,
              name: profileName,
              birthday: profile?.birthday ?? undefined,
              avatar: profile?.avatar ?? undefined,
              createdAt: now(),
              updatedAt: now(),
              dirty: 0,
            } as UserRecord;
            await db.users.put(user);
          }
          const supaWorkspaceId = await reconcileSupaWorkspace(supaUserId, {
            name: user.name,
            email,
            localId: user.id,
          });
          set({
            userId: user.id,
            email,
            name: user.name,
            avatar: user.avatar ?? null,
            supaUserId,
            supaWorkspaceId,
            ready: true,
          });
          await attachSupa(supaUserId, supaWorkspaceId, user.id);
          return;
        }

        // Local-only fallback
        const db = getDB();
        const user = (await db.users.where("email").equals(email).first()) as
          | (UserRecord & { passwordHash?: string })
          | undefined;
        if (!user || user.deletedAt) throw new Error("Akun tidak ditemukan");
        if (!user.encSalt || !user.passwordHash) {
          throw new Error("Akun tidak valid — daftar ulang");
        }
        const hash = await hashPassword(password, user.encSalt);
        if (hash !== user.passwordHash) throw new Error("Password salah");
        await unlockKey(password, user.encSalt);
        set({ userId: user.id, email: user.email, name: user.name, ready: true });
      },

      signInMagicLink: async (email: string) => {
        if (!hasSupabase()) {
          throw new Error("Magic link butuh Supabase aktif");
        }
        const sb = getSupabase();
        if (!sb) throw new Error("supabase_unavailable");
        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth`
            : undefined;
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw new Error(translateAuthError(error.message));
      },

      signOut: async () => {
        if (hasSupabase()) {
          const sb = getSupabase();
          if (sb) await sb.auth.signOut();
        }
        detachSupa();
        lockKey();
        set({
          userId: null,
          email: null,
          name: null,
          supaUserId: null,
          supaWorkspaceId: null,
        });
        useWorkspace.getState().reset();
      },

      updateProfile: async (patch) => {
        const { userId, supaUserId } = get();
        if (!userId) return;
        const db = getDB();
        const user = await db.users.get(userId);
        if (!user) return;
        const next = { ...user, ...patch, updatedAt: now(), dirty: 1 as const };
        await db.users.put(next);
        set({ name: next.name, avatar: next.avatar ?? null });
        useWorkspace.getState().upsertMember({
          id: next.id,
          name: next.name,
          email: next.email,
          isMe: true,
        });
        if (supaUserId) {
          await ensureSupaProfile(supaUserId, {
            name: next.name,
            birthday: next.birthday,
            avatar: next.avatar,
          });
        }
      },
    }),
    {
      name: "bareng:auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userId: s.userId,
        email: s.email,
        name: s.name,
        supaUserId: s.supaUserId,
        supaWorkspaceId: s.supaWorkspaceId,
      }),
    },
  ),
);

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email atau password salah";
  if (m.includes("already registered") || m.includes("user already"))
    return "Email sudah terdaftar — coba login";
  if (m.includes("password") && m.includes("6"))
    return "Password minimal 6 karakter";
  if (m.includes("email") && m.includes("invalid"))
    return "Format email tidak valid";
  return msg;
}
