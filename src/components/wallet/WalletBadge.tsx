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
  { match: /\bbca\b/i, mark: "BCA", bg: "#0b5cad", bg2: "#1c3f8a", fg: "#fff" },
  { match: /mandiri/i, mark: "mdr", bg: "#0b3a74", bg2: "#13284f", fg: "#ffd25c" },
  { match: /\bbri\b|britama/i, mark: "BRI", bg: "#00529c", bg2: "#0a3566", fg: "#fff" },
  { match: /\bbni\b/i, mark: "BNI", bg: "#0e6f74", bg2: "#0a4a4f", fg: "#ff8a3d" },
  { match: /\bbsi\b|syariah indonesia/i, mark: "BSI", bg: "#00a39d", bg2: "#00706c", fg: "#fff" },
  { match: /jago/i, mark: "jago", bg: "#f6b91c", bg2: "#d4920a", fg: "#1a1a1a" },
  { match: /seabank/i, mark: "Sea", bg: "#ff6a2b", bg2: "#d94812", fg: "#fff" },
  { match: /jenius|btpn/i, mark: "J", bg: "#00a0dc", bg2: "#0075a8", fg: "#fff" },
  { match: /\bblu\b/i, mark: "blu", bg: "#1fb4e6", bg2: "#0d84b0", fg: "#fff" },
  { match: /cimb/i, mark: "CIMB", bg: "#8a0f1d", bg2: "#5c0812", fg: "#fff" },
  { match: /permata/i, mark: "P", bg: "#1b7b3c", bg2: "#11542a", fg: "#fff" },
  { match: /gopay|gojek/i, mark: "go", bg: "#00aed6", bg2: "#0087a8", fg: "#fff" },
  { match: /\bovo\b/i, mark: "OVO", bg: "#4c2a86", bg2: "#331b5e", fg: "#fff" },
  { match: /\bdana\b/i, mark: "D", bg: "#118eea", bg2: "#0a63a8", fg: "#fff" },
  { match: /shopee/i, mark: "S", bg: "#ee4d2d", bg2: "#b8341a", fg: "#fff" },
  { match: /linkaja/i, mark: "L", bg: "#e82529", bg2: "#a8161a", fg: "#fff" },
];

export interface WalletLook {
  mark: string | null;
  bg: string;
  bg2: string;
  fg: string;
  cash: boolean;
}

const PALETTE = ["#3b5bdb", "#0f766e", "#9333ea", "#c2410c", "#be185d", "#0369a1"];

export function walletLook(name: string): WalletLook {
  const b = BRANDS.find((x) => x.match.test(name));
  if (b) return { mark: b.mark, bg: b.bg, bg2: b.bg2, fg: b.fg, cash: false };
  if (/tunai|cash|dompet|kas\b/i.test(name)) return { mark: null, bg: "#f59e0b", bg2: "#c2780a", fg: "#fff", cash: true };
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = PALETTE[h % PALETTE.length];
  return { mark: null, bg: c, bg2: `color-mix(in srgb, ${c} 70%, black)`, fg: "#fff", cash: false };
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
