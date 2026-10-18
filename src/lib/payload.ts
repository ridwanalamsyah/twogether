/** Parse a JSON payload column without ever throwing. */
export function parsePayload<T extends object>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}
