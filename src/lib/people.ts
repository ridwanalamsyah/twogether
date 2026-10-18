"use client";

import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";

export { addDays, daysBetween, fromIsoDay, isoDay } from "@/lib/dates";
export { parsePayload } from "@/lib/payload";

/**
 * Who is who in this workspace. Records are tagged with the person's
 * display name in `who` (same convention as transactions), so both phones
 * agree on whose entry is whose.
 */
export function usePeople(): { me: string; partner: string | null; all: string[] } {
  const name = useAuth((s) => s.name);
  const members = useWorkspace((s) => s.members);
  const meMember = members.find((m) => m.isMe);
  const me = meMember?.name || name || "Aku";
  const partner = members.find((m) => !m.isMe)?.name ?? null;
  return { me, partner, all: partner ? [me, partner] : [me] };
}



