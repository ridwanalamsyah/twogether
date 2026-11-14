"use client";

import { Banknote, Wallet as WalletIcon } from "lucide-react";

/**
 * A recognisable colour + short mark for common Indonesian banks and
 * e-wallets, derived from the name the couple typed ("BCA", "Gopay Ridwan").
 * Drawn as text on the brand colour — no logo images.
 */
interface Brand {
  match: RegExp;
  mark: string;
  bg: string;
  fg: string;
  /** Gradient end for the big card. */
  bg2: string;
}

const BRANDS: Brand[] = [
  { match: /\bbca\b/i, mark: "BCA", bg: "#0b5cad", bg2: "#17377d", fg: "#ffffff" },
  { match: /mandiri/i, mark: "mdr", bg: "#0b3a74", bg2: "#13284f", fg: "#ffd25c" },
  { match: /\bbri\b|britama/i, mark: "BRI", bg: "#00529c", bg2: "#0a3566", fg: "#ffffff" },
  { match: /\bbni\b/i, mark: "BNI", bg: "#0e6f74", bg2: "#08454a", fg: "#ffffff" },
  { match: /\bbsi\b|syariah indonesia/i, mark: "BSI", bg: "#007570", bg2: "#00524e", fg: "#ffffff" },
  { match: /jago/i, mark: "jago", bg: "#f6b91c", bg2: "#d99b0f", fg: "#141210" },
  { match: /seabank/i, mark: "Sea", bg: "#be3b0a", bg2: "#932a06", fg: "#ffffff" },
  { match: /jenius|btpn/i, mark: "J", bg: "#0072a8", bg2: "#00537d", fg: "#ffffff" },
  { match: /\bblu\b/i, mark: "blu", bg: "#0073a3", bg2: "#005175", fg: "#ffffff" },
  { match: /cimb/i, mark: "CIMB", bg: "#8a0f1d", bg2: "#5c0812", fg: "#ffffff" },
  { match: /permata/i, mark: "P", bg: "#1b7b3c", bg2: "#11542a", fg: "#ffffff" },
  { match: /gopay|gojek/i, mark: "go", bg: "#007694", bg2: "#00546b", fg: "#ffffff" },
  { match: /\bovo\b/i, mark: "OVO", bg: "#4c2a86", bg2: "#331b5e", fg: "#ffffff" },
  { match: /\bdana\b/i, mark: "D", bg: "#0b6cb8", bg2: "#074b85", fg: "#ffffff" },
  { match: /shopee/i, mark: "S", bg: "#c83214", bg2: "#96220c", fg: "#ffffff" },
  { match: /linkaja/i, mark: "L", bg: "#c81e22", bg2: "#941215", fg: "#ffffff" },
];

export interface WalletLook {
  mark: string | null;
  bg: string;
  bg2: string;
  fg: string;
  cash: boolean;
}

const PALETTE = ["#3b5bdb", "#0f766e", "#9333ea", "#b83b0a", "#be185d", "#0369a1"];

export function walletLook(name: string): WalletLook {
  const b = BRANDS.find((x) => x.match.test(name));
  if (b) return { mark: b.mark, bg: b.bg, bg2: b.bg2, fg: b.fg, cash: false };
  if (/tunai|cash|dompet|kas\b/i.test(name)) return { mark: null, bg: "#9c5600", bg2: "#754000", fg: "#ffffff", cash: true };
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = PALETTE[h % PALETTE.length];
  return { mark: null, bg: c, bg2: `color-mix(in srgb, ${c} 70%, black)`, fg: "#ffffff", cash: false };
}

export function WalletBadge({ name, size = 40 }: { name: string; size?: number }) {
  const l = walletLook(name);
  const Icon = l.cash ? Banknote : WalletIcon;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold italic tracking-tight"
      style={{
        width: size,
        height: size,
        background: l.bg,
        color: l.fg,
        fontSize: l.mark ? Math.max(8, size * (l.mark.length > 3 ? 0.24 : l.mark.length > 2 ? 0.3 : 0.42)) : undefined,
      }}
      aria-hidden
    >
      {l.mark ?? <Icon size={Math.round(size * 0.48)} strokeWidth={2} />}
    </span>
  );
}
