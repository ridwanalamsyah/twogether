"use client";

import { useCallback } from "react";
import { useAuth } from "@/stores/auth";
import { upsertItem, useItems } from "@/stores/data";

/**
 * Nicknames ("Mas", "Adek", "Ridwan") shown instead of account names.
 * Records keep using the account name in `who`, so this is display only —
 * stored as synced items (kind "nickname", title = account name, status =
 * nickname) so both phones agree.
 */
export function useNick() {
  const userId = useAuth((s) => s.userId);
  const rows = useItems(userId, "nickname");
  const nick = useCallback(
    (who?: string | null): string => {
      if (!who) return "";
      const n = rows?.find((r) => r.title === who)?.status?.trim();
      return n || who;
    },
    [rows],
  );
  const setNick = useCallback(
    async (who: string, value: string) => {
      if (!userId) return;
      const existing = rows?.find((r) => r.title === who);
      await upsertItem(userId, { ...(existing ?? {}), kind: "nickname", title: who, status: value.trim() });
    },
    [userId, rows],
  );
  return { nick, setNick, ready: rows !== undefined };
}
