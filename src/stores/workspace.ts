"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * A workspace member — a real human who shares this workspace.
 *
 * `id` matches the user's account id when they're a registered member.
 * For not-yet-onboarded partners, we still track them as a member with a
 * synthetic id (prefixed `pending:`) so historical transactions can be
 * tagged to them; once they sign up and accept an invite, the synthetic id
 * is rewritten to their real account id by the sync engine.
 */
export interface WorkspaceMember {
  id: string;
  name: string;
  email?: string;
  /** Used by the swatch in pickers; falls back to a deterministic palette. */
  color?: string;
  /** True for the user currently signed in on this device. */
  isMe?: boolean;
  /** Workspace creator. */
  isOwner?: boolean;
  /** Set while the partner is invited but hasn't joined yet. */
  pending?: boolean;
}

interface WorkspaceState {
  workspaceId: string | null;
  workspaceName: string;
  members: WorkspaceMember[];
  /** Pseudo-member used for shared expenses (split between everyone). */
  sharedLabel: string;
  setWorkspace: (input: {
    workspaceId: string;
    workspaceName?: string;
    members: WorkspaceMember[];
  }) => void;
  upsertMember: (m: WorkspaceMember) => void;
  removeMember: (id: string) => void;
  renameWorkspace: (name: string) => void;
  /** All names usable in "siapa" dropdowns: members + sharedLabel. */
  whoOptions: () => string[];
  /** Get the visual color for a given who-string. */
  colorFor: (who: string) => string;
  reset: () => void;
}

const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#16a34a",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#dc2626",
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaceId: null,
      workspaceName: "",
      members: [],
      sharedLabel: "Bersama",

      setWorkspace: ({ workspaceId, workspaceName, members }) =>
        set({
          workspaceId,
          workspaceName: workspaceName ?? get().workspaceName,
          members: members.map((m) => ({
            ...m,
            color: m.color ?? pickColor(m.id),
          })),
        }),

      upsertMember: (m) =>
        set((s) => {
          const next = [...s.members];
          const i = next.findIndex((x) => x.id === m.id);
          const filled = { ...m, color: m.color ?? pickColor(m.id) };
          if (i >= 0) next[i] = { ...next[i], ...filled };
          else next.push(filled);
          return { members: next };
        }),

      removeMember: (id) =>
        set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      renameWorkspace: (workspaceName) => set({ workspaceName }),

      whoOptions: () => {
        const ms = get().members;
        return [...ms.map((m) => m.name), get().sharedLabel];
      },

      colorFor: (who) => {
        const m = get().members.find((x) => x.name === who);
        if (m?.color) return m.color;
        if (who === get().sharedLabel) return "#6b6b6e";
        return pickColor(who);
      },

      reset: () => set({ workspaceId: null, workspaceName: "", members: [] }),
    }),
    {
      name: "bareng:workspace",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        workspaceId: s.workspaceId,
        workspaceName: s.workspaceName,
        members: s.members,
        sharedLabel: s.sharedLabel,
      }),
    },
  ),
);
