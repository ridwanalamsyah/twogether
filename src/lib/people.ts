"use client";

import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";

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

/** Parse a JSON payload column without ever throwing. */
export function parsePayload<T extends object>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

/** Local YYYY-MM-DD for a Date (toISOString would shift a day in WIB). */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse YYYY-MM-DD as a local date. */
export function fromIsoDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, n: number): string {
  const d = fromIsoDay(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromIsoDay(b).getTime() - fromIsoDay(a).getTime()) / 86_400_000);
}
