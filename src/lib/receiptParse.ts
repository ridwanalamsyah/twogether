/**
 * Pull the total and the shop name out of OCR'd receipt text.
 * Pure function (no OCR deps) so it can be unit-tested.
 */
export interface ParsedReceipt {
  amount: number | null;
  merchant: string | null;
}

const SKIP = /(sub\s*-?\s*total|kembali|kembalian|change|tunai|cash|diskon|discount|hemat|ppn|pajak|tax|service|poin|point|item|qty|jml\s*item)/i;
const STRONG = /(grand\s*total|total\s*(bayar|belanja|pembayaran|tagihan)|jumlah\s*(bayar|tagihan)|total\s*harga|net\s*total)/i;
const WEAK = /(total|jumlah|tagihan|amount|bayar|harus\s*dibayar)/i;

/** "Rp 1.234.500,00" / "1,234,500" / "45.000" → 1234500 / 45000 */
export function toNumber(raw: string): number | null {
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return null;
  // Drop a trailing ,00 / .00 decimal part.
  s = s.replace(/[.,]\d{2}$/, (m) => (s.length > 4 ? "" : m));
  const digits = s.replace(/[.,]/g, "");
  if (!digits || digits.length > 10) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function amountsIn(line: string): number[] {
  const out: number[] = [];
  const re = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d{3,9})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const n = toNumber(m[1]);
    if (n != null && n >= 100 && n < 100_000_000) out.push(n);
  }
  return out;
}

export function parseReceipt(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const pick = (re: RegExp): number | null => {
    let best: number | null = null;
    lines.forEach((line, i) => {
      if (!re.test(line) || SKIP.test(line)) return;
      // The amount may sit on the same line or the next one.
      const nums = amountsIn(line).length ? amountsIn(line) : amountsIn(lines[i + 1] ?? "");
      for (const n of nums) if (best == null || n > best) best = n;
    });
    return best;
  };

  let amount = pick(STRONG) ?? pick(WEAK);
  if (amount == null) {
    const all = lines.filter((l) => !SKIP.test(l)).flatMap(amountsIn);
    amount = all.length ? Math.max(...all) : null;
  }

  const merchant =
    lines
      .slice(0, 5)
      .find((l) => /[a-z]{3,}/i.test(l) && !/\d{3,}/.test(l) && l.length <= 40 && !/(struk|receipt|jl\.|jalan|telp|npwp)/i.test(l)) ?? null;

  return { amount, merchant: merchant ? titleCase(merchant) : null };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9&' .-]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
