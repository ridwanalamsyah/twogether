import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

const RP = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number): string {
  return RP.format(Math.round(value));
}

export function formatRupiahShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${Math.round(value)}`;
}

export function formatDateShort(date: string | number | Date): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}j lalu`;
  return `${Math.floor(diff / 86_400_000)}h lalu`;
}

/** Group an array by a key extractor. */
export function groupBy<T, K extends string | number>(
  arr: T[],
  fn: (item: T) => K,
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = fn(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

/** Average; returns 0 for empty arrays so chained math stays defined. */
export function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Standard deviation; returns 0 for arrays shorter than 2. */
export function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sq = arr.map((x) => (x - m) ** 2);
  return Math.sqrt(mean(sq));
}
