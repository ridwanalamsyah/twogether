"use client";

import { useAuth } from "@/stores/auth";
import { upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { usePeople, parsePayload } from "@/lib/people";
import { STATUS_TTL, type StatusPayload } from "@/lib/kabar";
import { todayISO } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";

/** Shared data + actions for pings and statuses. */
export function useKabar() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const pings = useEntries(userId, "ping") ?? [];
  const statuses = useItems(userId, "status") ?? [];

  const statusOf = (who: string | null): (StatusPayload & { id: string }) | null => {
    if (!who) return null;
    const it = statuses.find((s) => s.who === who);
    if (!it) return null;
    const p = parsePayload<StatusPayload>(it.payload, { emoji: "", text: "", energy: 3, at: 0 });
    if (!p.at || Date.now() - p.at > STATUS_TTL) return null;
    return { ...p, id: it.id };
  };

  async function sendPing(type: string, custom?: string) {
    if (!userId) return;
    await upsertEntry(userId, {
      kind: "ping",
      date: todayISO(),
      who: me,
      valueText: type,
      payload: JSON.stringify({ to: partner, text: custom?.trim().slice(0, 80) ?? "" }),
    });
    hapticSuccess();
  }

  async function setStatus(s: Omit<StatusPayload, "at">) {
    if (!userId) return;
    const existing = statuses.find((x) => x.who === me);
    await upsertItem(userId, {
      id: existing?.id,
      kind: "status",
      title: `Status ${me}`,
      who: me,
      payload: JSON.stringify({ ...s, at: Date.now() } satisfies StatusPayload),
    });
    hapticSuccess();
  }

  const sorted = [...pings].sort((a, b) => b.createdAt - a.createdAt);
  return {
    me,
    partner,
    pings: sorted,
    myStatus: statusOf(me),
    partnerStatus: statusOf(partner),
    sendPing,
    setStatus,
  };
}
