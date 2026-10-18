/**
 * A moment's place is kept as a "tempat:<name>" tag, so it syncs with the
 * existing tags column (no schema change) and old app versions just show it
 * as one more tag.
 */
const PREFIX = "tempat:";

export function placeOf(tags: string[] | undefined): string | null {
  const t = tags?.find((x) => x.startsWith(PREFIX));
  return t ? t.slice(PREFIX.length) : null;
}

export function withPlace(tags: string[] | undefined, place: string): string[] {
  const rest = (tags ?? []).filter((x) => !x.startsWith(PREFIX));
  const name = place.trim().slice(0, 60);
  return name ? [...rest, PREFIX + name] : rest;
}

/** Tags to show as #chips (the place has its own pin). */
export function plainTags(tags: string[] | undefined): string[] {
  return (tags ?? []).filter((x) => !x.startsWith(PREFIX));
}

export function mapsUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

export interface PlaceSummary {
  name: string;
  count: number;
  first: string;
  last: string;
}

/** Every place in these moments, most visited first. */
export function summarizePlaces(moments: { date: string; tags?: string[]; deletedAt?: number }[]): PlaceSummary[] {
  const map = new Map<string, PlaceSummary>();
  for (const m of moments) {
    if (m.deletedAt) continue;
    const name = placeOf(m.tags);
    if (!name) continue;
    const key = name.toLowerCase();
    const cur = map.get(key);
    if (!cur) map.set(key, { name, count: 1, first: m.date, last: m.date });
    else {
      cur.count += 1;
      if (m.date < cur.first) cur.first = m.date;
      if (m.date > cur.last) cur.last = m.date;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}
