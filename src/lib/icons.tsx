"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Banknote,
  BookOpen,
  Briefcase,
  CalendarDays,
  Calculator,
  Car,
  ChartColumn,
  ChartLine,
  CircleDashed,
  Clapperboard,
  Coffee,
  Compass,
  CreditCard,
  Download,
  Droplet,
  Droplets,
  Flame,
  Flower2,
  Fuel,
  Gem,
  Gift,
  GraduationCap,
  HandCoins,
  HandHeart,
  Headphones,
  Heart,
  HeartHandshake,
  House,
  Landmark,
  ListChecks,
  Mail,
  MessageCircleHeart,
  Moon,
  Newspaper,
  NotebookPen,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Sprout,
  Sun,
  Target,
  Trophy,
  Utensils,
  Wallet,
} from "lucide-react";

/**
 * One icon set for the whole app: line icons in one neutral tile. The tint
 * stays on the spec for places that need to tell categories apart (charts),
 * but tiles never use it, so the accent is the only colour in the chrome.
 */
export interface IconSpec {
  Icon: LucideIcon;
  /** Signature colour; the tile is this colour at low opacity. */
  tint: string;
}

const CATEGORY: Record<string, IconSpec> = {
  Makan: { Icon: Utensils, tint: "var(--tint-orange)" },
  Jajan: { Icon: Coffee, tint: "var(--tint-ochre)" },
  Bensin: { Icon: Fuel, tint: "var(--tint-sky)" },
  Transport: { Icon: Car, tint: "var(--tint-sky)" },
  Laundry: { Icon: Shirt, tint: "var(--tint-violet)" },
  Skincare: { Icon: Droplet, tint: "var(--tint-pink)" },
  Kuliah: { Icon: GraduationCap, tint: "var(--tint-indigo)" },
  Usaha: { Icon: Briefcase, tint: "var(--tint-yellow)" },
  Gaji: { Icon: Banknote, tint: "var(--tint-green)" },
  Ortu: { Icon: HeartHandshake, tint: "var(--tint-rose)" },
  Tabungan: { Icon: PiggyBank, tint: "var(--tint-emerald)" },
  Rumah: { Icon: House, tint: "var(--tint-teal)" },
  Belanja: { Icon: ShoppingBag, tint: "var(--tint-purple)" },
  Langganan: { Icon: Repeat, tint: "var(--tint-blue)" },
  Subscription: { Icon: Repeat, tint: "var(--tint-blue)" },
  Cicilan: { Icon: CreditCard, tint: "var(--tint-red)" },
  Hadiah: { Icon: Gift, tint: "var(--tint-rose)" },
  Liburan: { Icon: Plane, tint: "var(--tint-cyan)" },
  Kesehatan: { Icon: Activity, tint: "var(--tint-red)" },
  Sedekah: { Icon: HandHeart, tint: "var(--tint-emerald)" },
  Lainnya: { Icon: CircleDashed, tint: "var(--tint-slate)" },
};

export function categoryIcon(category: string, kind?: "in" | "out"): IconSpec {
  if (CATEGORY[category]) return CATEGORY[category];
  if (kind === "in") return { Icon: Banknote, tint: "var(--tint-green)" };
  return CATEGORY.Lainnya;
}

const SPACE: Record<string, IconSpec> = {
  "/goals": { Icon: Target, tint: "var(--tint-green)" },
  "/moments": { Icon: Mail, tint: "var(--tint-rose)" },
  "/kita": { Icon: Heart, tint: "var(--tint-pink)" },
  "/habits": { Icon: Sprout, tint: "var(--tint-lime)" },
  "/calendar": { Icon: CalendarDays, tint: "var(--tint-indigo)" },
  "/catatan": { Icon: NotebookPen, tint: "var(--tint-stone)" },
  "/shalat": { Icon: Moon, tint: "var(--tint-emerald)" },
  "/siklus": { Icon: Flower2, tint: "var(--tint-rose)" },
  "/patungan": { Icon: HandCoins, tint: "var(--tint-amber)" },
  "/belanja": { Icon: ShoppingCart, tint: "var(--tint-green)" },
  "/nikah": { Icon: Gem, tint: "var(--tint-mauve)" },
  "/kabar": { Icon: MessageCircleHeart, tint: "var(--tint-rose)" },
  "/tantangan": { Icon: Flame, tint: "var(--tint-orange)" },
  "/target": { Icon: Trophy, tint: "var(--tint-violet)" },
  "/fokus": { Icon: Headphones, tint: "var(--tint-sky)" },
  "/tagihan": { Icon: Receipt, tint: "var(--tint-red)" },
  "/aset": { Icon: ChartLine, tint: "var(--tint-forest)" },
  "/dompet": { Icon: Wallet, tint: "var(--tint-amber)" },
  "/laporan": { Icon: ChartColumn, tint: "var(--tint-blue)" },
  "/impor": { Icon: Download, tint: "var(--tint-stone)" },
  "/hijriah": { Icon: Moon, tint: "var(--tint-pine)" },
  "/ramadhan": { Icon: Sun, tint: "var(--tint-gold)" },
  "/tilawah": { Icon: BookOpen, tint: "var(--tint-emerald)" },
  "/zakat": { Icon: Calculator, tint: "var(--tint-bronze)" },
  "/jadwal": { Icon: GraduationCap, tint: "var(--tint-violet)" },
  "/skripsi": { Icon: ListChecks, tint: "var(--tint-purple)" },
  "/uang": { Icon: Landmark, tint: "var(--tint-amber)" },
  "/sehat": { Icon: Droplets, tint: "var(--tint-sky)" },
  "/rumah": { Icon: House, tint: "var(--tint-orange)" },
  "/list": { Icon: Archive, tint: "var(--tint-yellow)" },
  "/travel": { Icon: Plane, tint: "var(--tint-cyan)" },
  "/belajar": { Icon: BookOpen, tint: "var(--tint-ochre)" },
  "/reflection": { Icon: NotebookPen, tint: "var(--tint-teal)" },
  "/pencapaian": { Icon: Trophy, tint: "var(--tint-sun)" },
  "/insights": { Icon: Compass, tint: "var(--tint-emerald)" },
  "/digest": { Icon: Newspaper, tint: "var(--tint-stone)" },
  "/wrapped": { Icon: Clapperboard, tint: "var(--tint-crimson)" },
  "/tracker": { Icon: Wallet, tint: "var(--tint-amber)" },
};

export function spaceIcon(href: string): IconSpec {
  return SPACE[href] ?? { Icon: Compass, tint: "var(--tint-slate)" };
}

/** Apple-style tinted squircle tile with tactile touch feedback. */
export function IconTile({
  spec,
  size = 44,
  radius,
  className = "",
}: {
  spec: IconSpec;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const { Icon, tint } = spec;
  const r = radius ?? Math.max(8, Math.round(size * 0.28));
  return (
    <span
      className={`grid shrink-0 place-items-center transition-transform duration-150 active:scale-95 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: `color-mix(in srgb, ${tint} 13%, var(--bg-card, transparent))`,
        color: `color-mix(in srgb, ${tint} 60%, var(--text-1))`,
        border: `1px solid color-mix(in srgb, ${tint} 22%, transparent)`,
        boxShadow: `0 2px 8px -2px color-mix(in srgb, ${tint} 18%, transparent)`,
      }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2.2} />
    </span>
  );
}

const BUNDLE: Record<string, IconSpec> = {
  ibadah: { Icon: Moon, tint: "var(--tint-pine)" },
  uang: { Icon: Wallet, tint: "var(--tint-amber)" },
  berdua: { Icon: Heart, tint: "var(--tint-pink)" },
  kuliah: { Icon: GraduationCap, tint: "var(--tint-violet)" },
  nikah: { Icon: Gem, tint: "var(--tint-mauve)" },
  sehat: { Icon: Droplets, tint: "var(--tint-sky)" },
};

export function bundleIcon(id: string): IconSpec {
  return BUNDLE[id] ?? { Icon: Compass, tint: "var(--tint-slate)" };
}
