/**
 * Which spaces this phone actually opens, so Jelajah can put those first and
 * suggest hiding the ones nobody touches. Stays in localStorage on this
 * device only: nothing is sent anywhere.
 */

export interface Usage {
  /** When counting started on this phone (ms). */
  since: number;
  /** href → visits and last visit (ms). */
  spaces: Record<string, { n: number; last: number }>;
}

const KEY = "twogether:usage:v1";
const DAY = 86_400_000;

export function emptyUsage(now: number): Usage {
  return { since: now, spaces: {} };
}

export function loadUsage(now = Date.now()): Usage {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const u = JSON.parse(raw) as Usage;
      if (typeof u.since === "number" && u.spaces) return u;
    }
  } catch {
    /* private mode or bad JSON: start over */
  }
  return emptyUsage(now);
}

export function withVisit(u: Usage, href: string, now: number): Usage {
  const prev = u.spaces[href];
  return { ...u, spaces: { ...u.spaces, [href]: { n: (prev?.n ?? 0) + 1, last: now } } };
}

export function recordVisit(href: string, now = Date.now()) {
  try {
    localStorage.setItem(KEY, JSON.stringify(withVisit(loadUsage(now), href, now)));
  } catch {
    /* storage full or blocked: ranking just stays as it was */
  }
}

/**
 * The spaces opened most lately: visits weighted down by age (half-life of
 * two weeks), so last month's habit gives way to this week's.
 */
export function frequent(u: Usage, hrefs: string[], now: number, max = 5): string[] {
  const score = (h: string) => {
    const s = u.spaces[h];
    if (!s) return 0;
    return s.n * Math.pow(0.5, (now - s.last) / (14 * DAY));
  };
  return hrefs
    .filter((h) => (u.spaces[h]?.n ?? 0) >= 2)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
}

/**
 * Spaces not opened in `days` days. Empty until counting has run that long,
 * so a fresh install never calls everything unused.
 */
export function unused(u: Usage, hrefs: string[], now: number, days = 30): string[] {
  if (now - u.since < days * DAY) return [];
  return hrefs.filter((h) => {
    const s = u.spaces[h];
    return !s || now - s.last >= days * DAY;
  });
}
