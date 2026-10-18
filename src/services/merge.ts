/**
 * Which copy wins when the server sends a record we may already have.
 *
 * Local edits that haven't reached the server yet (dirty = 1) always stay:
 * the outbox will push them and the server echoes them back. Otherwise the
 * newer `updatedAt` wins, so a late or repeated pull can never roll a record
 * back to an older version. Dependency-free so it can be unit tested.
 */
export interface Versioned {
  updatedAt?: number;
  dirty?: number;
}

export function shouldApplyRemote(local: Versioned | undefined, incoming: Versioned): boolean {
  if (!local) return true;
  if (local.dirty === 1) return false;
  return (incoming.updatedAt ?? 0) >= (local.updatedAt ?? 0);
}

/** Pull cursor: newest server time seen, minus a margin for phone clock drift. */
export const CURSOR_MARGIN_MS = 10 * 60_000;

export function nextCursor(prev: number | null, rows: { updatedAt?: number }[]): number | null {
  let max = prev ?? 0;
  for (const r of rows) if ((r.updatedAt ?? 0) > max) max = r.updatedAt!;
  return max > 0 ? max : prev;
}
