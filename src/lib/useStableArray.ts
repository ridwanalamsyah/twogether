import { useMemo } from "react";

// Module-level frozen empty array — a stable reference for hooks to return
// when the upstream value is `undefined`. Reused across all calls.
const EMPTY: readonly unknown[] = [];

/**
 * Stable reference for an optional array. Returns the input when defined,
 * or a single shared empty-array sentinel otherwise.
 *
 * Use this instead of `useSomething(userId) ?? []` so the value reference
 * stays stable across renders and downstream `useMemo`/`useEffect`
 * dependencies don't change unnecessarily (and so the
 * `react-hooks/exhaustive-deps` lint stays quiet).
 */
export function useStableArray<T>(arr: T[] | undefined): T[] {
  return useMemo(() => arr ?? (EMPTY as T[]), [arr]);
}
