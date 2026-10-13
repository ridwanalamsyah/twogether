/**
 * "Catat pakai suara": the browser/phone's own speech recognition (Indonesian),
 * then a small parser that turns "makan bakso dua puluh lima ribu" into
 * amount 25.000 + note "makan bakso".
 */

type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function ctor(): (new () => Rec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const voiceSupported = () => !!ctor();

/** Listen once; resolves with what was said (or rejects with a reason). */
export function listenOnce(onStart?: () => void): { promise: Promise<string>; stop: () => void } {
  const C = ctor();
  if (!C) return { promise: Promise.reject(new Error("unsupported")), stop: () => {} };
  const rec = new C();
  rec.lang = "id-ID";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let heard = "";
  const promise = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      heard = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    rec.onerror = (e) => reject(new Error(e.error || "error"));
    rec.onend = () => (heard ? resolve(heard) : reject(new Error("no-speech")));
  });
  rec.start();
  onStart?.();
  return { promise, stop: () => rec.stop() };
}

const UNITS: Record<string, number> = {
  nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9,
  sepuluh: 10, sebelas: 11, seratus: 100, seribu: 1000, sejuta: 1_000_000,
};

/** Indonesian number words ("dua puluh lima ribu") → 25000, or null. */
export function wordsToNumber(text: string): number | null {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let any = false;
  for (const w of words) {
    if (w in UNITS && !["seratus", "seribu", "sejuta"].includes(w)) {
      current += UNITS[w];
      any = true;
    } else if (w === "belas") current += 10;
    else if (w === "puluh") current *= 10;
    else if (w === "ratus") current *= 100;
    else if (w === "seratus") (current += 100), (any = true);
    else if (w === "ribu" || w === "rb") {
      total += (current || 1) * 1000;
      current = 0;
    } else if (w === "seribu") (total += 1000), (any = true);
    else if (w === "juta" || w === "jt") {
      total += (current || 1) * 1_000_000;
      current = 0;
    } else if (w === "sejuta") (total += 1_000_000), (any = true);
    else if (w === "setengah") (current += 0.5), (any = true);
    else if (/^\d+([.,]\d+)?$/.test(w)) {
      current += Number(w.replace(/\./g, "").replace(",", "."));
      any = true;
    }
  }
  const n = Math.round(total + current);
  return any && n > 0 ? n : null;
}

const NUMBER_WORDS = /\b(nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|seratus|ribu|rb|seribu|juta|jt|sejuta|setengah|rupiah|rp|\d[\d.,]*)\b/gi;
const INCOME = /\b(gaji|gajian|terima|dapat|dapet|masuk|bonus|transferan|dikasih|thr|honor)\b/i;

export interface Spoken {
  amount: number | null;
  note: string;
  kind: "in" | "out";
}

/** "isi bensin lima puluh ribu" → { amount: 50000, note: "isi bensin", kind: "out" } */
export function parseSpoken(text: string): Spoken {
  const t = text.toLowerCase().replace(/(\d)\s*(rb|ribu|k)\b/g, "$1 ribu").replace(/(\d)\s*(jt|juta)\b/g, "$1 juta");
  // Digits with dots ("25.000") come through as one token.
  const m = t.match(/(\d[\d.,]*)\s*(ribu|juta)?/);
  let amount: number | null = null;
  if (m) {
    const base = Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    amount = Math.round(base * (m[2] === "juta" ? 1_000_000 : m[2] === "ribu" ? 1000 : 1));
  }
  if (!amount) amount = wordsToNumber(t);
  const note = text
    .replace(/\d[\d.,]*\s*(rb|k|jt)?\b/gi, " ")
    .replace(NUMBER_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { amount, note: note ? note[0].toUpperCase() + note.slice(1) : "", kind: INCOME.test(t) ? "in" : "out" };
}
