"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getDB, newId, now, type UserRecord } from "@/lib/db";
import {
  decryptString,
  encryptString,
  generateSalt,
  hashPassword,
  lockKey,
  unlockKey,
} from "@/lib/crypto";
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
  /** Change password while signed in (verifies the current one first). */
  changePassword: (current: string, next: string) => Promise<void>;
  /** Set a new password from a "lupa password" email link session. */
  setRecoveredPassword: (next: string) => Promise<void>;
  /** Email a reset link (server accounts only). */
  requestPasswordReset: (email: string) => Promise<void>;
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
  if (!sb) throw new Error("Tidak bisa terhubung ke server");
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

/** Rejects with `timeout` when `p` doesn't settle within `ms`. */
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Seed the local-only workspace so the UI always has a roster to show. */
function ensureLocalWorkspace(user: Pick<UserRecord, "id" | "name" | "email">) {
  const ws = useWorkspace.getState();
  if (!ws.workspaceId || ws.members.length === 0) {
    ws.setWorkspace({
      workspaceId: `ws_${user.id}`,
      workspaceName: `Workspace ${user.name}`,
      members: [
        { id: user.id, name: user.name, email: user.email, isMe: true, isOwner: true },
      ],
    });
  } else {
    ws.upsertMember({ id: user.id, name: user.name, email: user.email, isMe: true });
  }
}

/** Find (or create) the local Dexie user that mirrors a Supabase account. */
async function ensureLocalUserForSupa(
  supaUserId: string,
  email: string,
  preferredLocalId: string | null,
  fallbackName?: string | null,
): Promise<UserRecord> {
  const db = getDB();
  let user: UserRecord | undefined = preferredLocalId
    ? await db.users.get(preferredLocalId)
    : undefined;
  if (!user || user.deletedAt) {
    user = await db.users.where("email").equals(email).first();
  }
  if (user && !user.deletedAt) return user;

  let profile: { name?: string; birthday?: string; avatar?: string } | null = null;
  const sb = getSupabase();
  if (sb) {
    try {
      const res = await withTimeout(
        sb
          .from("profiles")
          .select("name, birthday, avatar")
          .eq("id", supaUserId)
          .maybeSingle(),
        6000,
        "profile",
      );
      profile = res.data;
    } catch (err) {
      console.warn("[auth] profile fetch failed:", err);
    }
  }
  const localId = preferredLocalId ?? newId();
  const created: UserRecord = {
    id: localId,
    userId: localId,
    email,
    name: profile?.name || fallbackName || email.split("@")[0],
    birthday: profile?.birthday ?? undefined,
    avatar: profile?.avatar ?? undefined,
    createdAt: now(),
    updatedAt: now(),
    dirty: 0,
  };
  await db.users.put(created);
  return created;
}

/**
 * Connect the signed-in Supabase user to their workspace. Never throws: if
 * the backend is unreachable or misconfigured the app keeps working in
 * local mode and retries on the next launch.
 */
async function connectSupa(
  supaUserId: string,
  user: UserRecord,
  set: (p: Partial<AuthState>) => void,
): Promise<void> {
  try {
    const supaWorkspaceId = await withTimeout(
      reconcileSupaWorkspace(supaUserId, {
        name: user.name,
        email: user.email,
        localId: user.id,
      }),
      10000,
      "workspace",
    );
    set({ supaUserId, supaWorkspaceId });
    // Pulling every table can take a while on slow networks — never block
    // the UI on it.
    void attachSupa(supaUserId, supaWorkspaceId, user.id);
  } catch (err) {
    console.warn("[auth] workspace connect failed, staying local:", err);
    ensureLocalWorkspace(user);
  }
}

let bootstrapPromise: Promise<void> | null = null;

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

      bootstrap: () => {
        if (bootstrapPromise) return bootstrapPromise;
        bootstrapPromise = (async () => {
          try {
            // 1) Fast path: a local session exists → show the app right
            //    away from IndexedDB, then reconnect to Supabase in the
            //    background. The UI never waits for the network.
            const { userId } = get();
            const local = userId ? await getDB().users.get(userId) : undefined;
            if (local && !local.deletedAt) {
              set({
                userId: local.id,
                email: local.email,
                name: local.name,
                avatar: local.avatar ?? null,
                ready: true,
              });
              ensureLocalWorkspace(local);
              if (hasSupabase()) void refreshSupaSession(local);
              return;
            }

            // 2) No local user (fresh device, cleared storage, or returning
            //    from a magic link) → ask Supabase, but with a hard timeout.
            if (hasSupabase()) {
              const sb = getSupabase();
              const res = sb
                ? await withTimeout(sb.auth.getSession(), 8000, "session").catch(
                    () => null,
                  )
                : null;
              const session = res?.data.session;
              if (session?.user) {
                const email = session.user.email ?? "";
                const user = await ensureLocalUserForSupa(
                  session.user.id,
                  email,
                  null,
                  get().name,
                );
                set({
                  userId: user.id,
                  email,
                  name: user.name,
                  avatar: user.avatar ?? null,
                  supaUserId: session.user.id,
                  ready: true,
                });
                ensureLocalWorkspace(user);
                void connectSupa(session.user.id, user, set);
                return;
              }
            }
            set({ userId: null, email: null, name: null, ready: true });
          } catch (err) {
            console.warn("[auth] bootstrap failed:", err);
            set({ ready: true });
          } finally {
            bootstrapPromise = null;
          }
        })();
        return bootstrapPromise;

        async function refreshSupaSession(local: UserRecord) {
          const sb = getSupabase();
          if (!sb) return;
          try {
            const { data } = await withTimeout(sb.auth.getSession(), 8000, "session");
            const supaUser = data.session?.user;
            if (!supaUser) return;
            if (get().userId !== local.id) return; // signed out meanwhile
            await connectSupa(supaUser.id, local, set);
          } catch (err) {
            console.warn("[auth] background session refresh failed:", err);
          }
        }
      },

      signUp: async ({ email, password, name, birthday, seed = true }) => {
        if (hasSupabase()) {
          const sb = getSupabase();
          if (!sb) throw new Error("Tidak bisa terhubung ke server");
          const { data, error } = await withTimeout(
            sb.auth.signUp({ email, password, options: { data: { name } } }),
            15000,
            "signup",
          ).catch((err: Error) => ({ data: null, error: err }));
          if (error || !data) throw new Error(translateAuthError(error?.message ?? ""));
          const supaUserId = data.user?.id;
          if (!supaUserId) {
            throw new Error("Cek email kamu untuk konfirmasi, lalu coba login.");
          }
          if (!data.session) {
            // Email confirmation is probably on. Try signing in right away
            // (works when the project auto-confirms).
            const { error: signinErr } = await sb.auth.signInWithPassword({
              email,
              password,
            });
            if (signinErr) {
              throw new Error(
                "Akun dibuat! Kami kirim email konfirmasi — klik link di email, lalu login di sini.",
              );
            }
          }
          try {
            await withTimeout(
              ensureSupaProfile(supaUserId, { name, birthday, avatar: undefined }),
              6000,
              "profile",
            );
          } catch (err) {
            console.warn("[auth] profile upsert failed:", err);
          }

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
          set({ userId: localId, email, name, supaUserId, ready: true });
          ensureLocalWorkspace(user);
          await connectSupa(supaUserId, user, set);
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
          throw new Error("Email sudah terdaftar — coba login");
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
          if (!sb) throw new Error("Tidak bisa terhubung ke server");
          const { data, error } = await withTimeout(
            sb.auth.signInWithPassword({ email, password }),
            15000,
            "signin",
          ).catch((err: Error) => ({ data: null, error: err }));
          if (error || !data?.user) {
            // An account created before Supabase was wired lives only on
            // this device — let it in instead of a confusing failure.
            const local = await signInLocal(email, password).catch(() => null);
            if (local) {
              set({ ...local, ready: true });
              ensureLocalWorkspace({ id: local.userId, name: local.name, email });
              return;
            }
            throw new Error(translateAuthError(error?.message ?? "Login gagal"));
          }
          const supaUserId = data.user.id;
          const user = await ensureLocalUserForSupa(supaUserId, email, null);
          set({
            userId: user.id,
            email,
            name: user.name,
            avatar: user.avatar ?? null,
            supaUserId,
            ready: true,
          });
          ensureLocalWorkspace(user);
          await connectSupa(supaUserId, user, set);
          return;
        }

        const local = await signInLocal(email, password);
        set({ ...local, ready: true });
        ensureLocalWorkspace({ id: local.userId, name: local.name, email });
      },

      signInMagicLink: async (email: string) => {
        if (!hasSupabase()) {
          throw new Error("Masuk lewat link email belum tersedia");
        }
        const sb = getSupabase();
        if (!sb) throw new Error("Tidak bisa terhubung ke server");
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
          if (sb) {
            // Don't let a dead network keep the user signed in.
            await withTimeout(sb.auth.signOut(), 4000, "signout").catch(
              () => undefined,
            );
          }
        }
        detachSupa();
        lockKey();
        set({
          userId: null,
          email: null,
          name: null,
          avatar: null,
          supaUserId: null,
          supaWorkspaceId: null,
        });
        useWorkspace.getState().reset();
      },

      changePassword: async (current, next) => {
        if (next.length < 6) throw new Error("Password baru minimal 6 karakter");
        if (current === next) throw new Error("Password baru harus beda dari yang lama");
        const { userId, email, supaUserId } = get();
        if (!userId || !email) throw new Error("Masuk dulu untuk ganti password");

        const db = getDB();
        const local = (await db.users.get(userId)) as
          | (UserRecord & { passwordHash?: string })
          | undefined;

        // Device-only account: verify locally, then re-encrypt locked
        // Moments, because their key is derived from the password.
        if (local?.passwordHash && local.encSalt) {
          const salt = local.encSalt;
          if ((await hashPassword(current, salt)) !== local.passwordHash) {
            throw new Error("Password lama salah");
          }
          await unlockKey(current, salt);
          const locked = (await db.moments.where("userId").equals(userId).toArray()).filter(
            (m) => m.encrypted && m.cipher && !m.deletedAt,
          );
          const plain: { id: string; text: string }[] = [];
          for (const m of locked) {
            try {
              plain.push({ id: m.id, text: await decryptString(m.cipher!) });
            } catch {
              // Already unreadable — leave as is.
            }
          }
          await unlockKey(next, salt);
          for (const { id, text } of plain) {
            const m = await db.moments.get(id);
            if (!m) continue;
            await sync.recordWrite("moments", {
              ...m,
              cipher: await encryptString(text),
              updatedAt: now(),
              dirty: 1 as const,
            });
          }
          await db.users.put({
            ...local,
            passwordHash: await hashPassword(next, salt),
            updatedAt: now(),
          } as UserRecord);
          return;
        }

        if (!hasSupabase() || !supaUserId) {
          throw new Error("Akun ini tidak punya password yang bisa diganti di sini");
        }
        const sb = getSupabase();
        if (!sb) throw new Error("Tidak bisa terhubung ke server");
        const check = await withTimeout(
          sb.auth.signInWithPassword({ email, password: current }),
          15000,
          "verify",
        ).catch((err: Error) => ({ error: err }));
        if (check.error) {
          const m = check.error.message.toLowerCase();
          if (m.includes("invalid login")) throw new Error("Password lama salah");
          throw new Error(translateAuthError(check.error.message));
        }
        const { error } = await withTimeout(
          sb.auth.updateUser({ password: next }),
          15000,
          "update",
        ).catch((err: Error) => ({ error: err }));
        if (error) throw new Error(translateAuthError(error.message));
      },

      setRecoveredPassword: async (next) => {
        if (next.length < 6) throw new Error("Password baru minimal 6 karakter");
        const sb = getSupabase();
        if (!sb) throw new Error("Tidak bisa terhubung ke server");
        const { error } = await withTimeout(
          sb.auth.updateUser({ password: next }),
          15000,
          "update",
        ).catch((err: Error) => ({ error: err }));
        if (error) throw new Error(translateAuthError(error.message));
      },

      requestPasswordReset: async (email) => {
        const db = getDB();
        const local = (await db.users.where("email").equals(email).first()) as
          | (UserRecord & { passwordHash?: string })
          | undefined;
        if (!hasSupabase() || local?.passwordHash) {
          throw new Error(
            "Akun ini cuma tersimpan di HP ini, jadi password-nya tidak bisa direset lewat email.",
          );
        }
        const sb = getSupabase();
        if (!sb) throw new Error("Tidak bisa terhubung ke server");
        const { error } = await withTimeout(
          sb.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth?reset=1`,
          }),
          15000,
          "reset",
        ).catch((err: Error) => ({ error: err }));
        if (error) throw new Error(translateAuthError(error.message));
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

/** Verify a device-local (PBKDF2) account. */
async function signInLocal(
  email: string,
  password: string,
): Promise<{ userId: string; email: string; name: string; avatar: string | null }> {
  const db = getDB();
  const user = (await db.users.where("email").equals(email).first()) as
    | (UserRecord & { passwordHash?: string })
    | undefined;
  if (!user || user.deletedAt) throw new Error("Akun tidak ditemukan — coba daftar dulu");
  if (!user.encSalt || !user.passwordHash) {
    throw new Error("Akun ini login lewat server — cek koneksi internet");
  }
  const hash = await hashPassword(password, user.encSalt);
  if (hash !== user.passwordHash) throw new Error("Password salah");
  await unlockKey(password, user.encSalt);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? null,
  };
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.startsWith("timeout") || m.includes("failed to fetch") || m.includes("network"))
    return "Tidak bisa terhubung ke server. Cek internet kamu lalu coba lagi.";
  if (m.includes("email not confirmed"))
    return "Email belum dikonfirmasi — buka link di inbox kamu dulu.";
  if (m.includes("should be different") || m.includes("same password"))
    return "Password baru harus beda dari yang lama";
  if (m.includes("weak") || (m.includes("password") && m.includes("characters")))
    return "Password terlalu lemah — pakai minimal 6 karakter";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (m.includes("invalid login")) return "Email atau password salah";
  if (m.includes("already registered") || m.includes("user already"))
    return "Email sudah terdaftar — coba login";
  if (m.includes("password") && m.includes("6"))
    return "Password minimal 6 karakter";
  if (m.includes("email") && m.includes("invalid"))
    return "Format email tidak valid";
  return msg || "Terjadi kesalahan, coba lagi.";
}
