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
  Sparkles,
  Sprout,
  Sun,
  Target,
  Trophy,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";

/**
 * One icon set for the whole app (line icons in a softly tinted tile), so
 * categories and spaces look designed rather than emoji-decorated.
 */
export interface IconSpec {
  Icon: LucideIcon;
  /** Signature colour; the tile is this colour at low opacity. */
  tint: string;
}

const CATEGORY: Record<string, IconSpec> = {
  Makan: { Icon: Utensils, tint: "#f97316" },
  Jajan: { Icon: Coffee, tint: "#d97706" },
  Bensin: { Icon: Fuel, tint: "#0ea5e9" },
  Transport: { Icon: Car, tint: "#0ea5e9" },
  Laundry: { Icon: Shirt, tint: "#8b5cf6" },
  Skincare: { Icon: Sparkles, tint: "#ec4899" },
  Kuliah: { Icon: GraduationCap, tint: "#6366f1" },
  Usaha: { Icon: Briefcase, tint: "#eab308" },
  Gaji: { Icon: Banknote, tint: "#22c55e" },
  Ortu: { Icon: HeartHandshake, tint: "#f43f5e" },
  Tabungan: { Icon: PiggyBank, tint: "#10b981" },
  Rumah: { Icon: House, tint: "#14b8a6" },
  Belanja: { Icon: ShoppingBag, tint: "#a855f7" },
  Langganan: { Icon: Repeat, tint: "#3b82f6" },
  Subscription: { Icon: Repeat, tint: "#3b82f6" },
  Cicilan: { Icon: CreditCard, tint: "#ef4444" },
  Hadiah: { Icon: Gift, tint: "#f43f5e" },
  Liburan: { Icon: Plane, tint: "#06b6d4" },
  Kesehatan: { Icon: Activity, tint: "#ef4444" },
  Sedekah: { Icon: HandHeart, tint: "#10b981" },
  Lainnya: { Icon: CircleDashed, tint: "#94a3b8" },
};

export function categoryIcon(category: string, kind?: "in" | "out"): IconSpec {
  if (CATEGORY[category]) return CATEGORY[category];
  if (kind === "in") return { Icon: Banknote, tint: "#22c55e" };
  return CATEGORY.Lainnya;
}

const SPACE: Record<string, IconSpec> = {
  "/goals": { Icon: Target, tint: "#22c55e" },
  "/moments": { Icon: Mail, tint: "#f43f5e" },
  "/kita": { Icon: Heart, tint: "#ec4899" },
  "/habits": { Icon: Sprout, tint: "#84cc16" },
  "/calendar": { Icon: CalendarDays, tint: "#6366f1" },
  "/catatan": { Icon: NotebookPen, tint: "#64748b" },
  "/shalat": { Icon: Moon, tint: "#10b981" },
  "/siklus": { Icon: Flower2, tint: "#f43f5e" },
  "/patungan": { Icon: HandCoins, tint: "#f59e0b" },
  "/belanja": { Icon: ShoppingCart, tint: "#22c55e" },
  "/nikah": { Icon: Gem, tint: "#b76e79" },
  "/kabar": { Icon: MessageCircleHeart, tint: "#f43f5e" },
  "/tantangan": { Icon: Flame, tint: "#f97316" },
  "/target": { Icon: Trophy, tint: "#8b5cf6" },
  "/fokus": { Icon: Headphones, tint: "#0ea5e9" },
  "/tagihan": { Icon: Receipt, tint: "#ef4444" },
  "/aset": { Icon: ChartLine, tint: "#0f766e" },
  "/dompet": { Icon: Wallet, tint: "#f59e0b" },
  "/laporan": { Icon: ChartColumn, tint: "#3b82f6" },
  "/impor": { Icon: Download, tint: "#64748b" },
  "/hijriah": { Icon: Moon, tint: "#0f7a5c" },
  "/ramadhan": { Icon: Sun, tint: "#d9b24c" },
  "/tilawah": { Icon: BookOpen, tint: "#10b981" },
  "/zakat": { Icon: Calculator, tint: "#a16207" },
  "/jadwal": { Icon: GraduationCap, tint: "#8b5cf6" },
  "/skripsi": { Icon: ListChecks, tint: "#a855f7" },
  "/uang": { Icon: Landmark, tint: "#f59e0b" },
  "/sehat": { Icon: Droplets, tint: "#0ea5e9" },
  "/rumah": { Icon: House, tint: "#f97316" },
  "/list": { Icon: Archive, tint: "#eab308" },
  "/travel": { Icon: Plane, tint: "#06b6d4" },
  "/belajar": { Icon: BookOpen, tint: "#d97706" },
  "/reflection": { Icon: NotebookPen, tint: "#14b8a6" },
  "/pencapaian": { Icon: Trophy, tint: "#facc15" },
  "/grafik": { Icon: ChartLine, tint: "#3b82f6" },
  "/insights": { Icon: Compass, tint: "#10b981" },
  "/digest": { Icon: Newspaper, tint: "#64748b" },
  "/wrapped": { Icon: Clapperboard, tint: "#e11d48" },
  "/tracker": { Icon: Wallet, tint: "#f59e0b" },
};

export function spaceIcon(href: string): IconSpec {
  return SPACE[href] ?? { Icon: Zap, tint: "#94a3b8" };
}

/** Rounded tile with a tinted background and a line icon. */
export function IconTile({
  spec,
  size = 44,
  radius = 14,
  className = "",
}: {
  spec: IconSpec;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const { Icon, tint } = spec;
  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `color-mix(in srgb, ${tint} 16%, transparent)`,
        color: tint,
      }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2} />
    </span>
  );
}

const BUNDLE: Record<string, IconSpec> = {
  ibadah: { Icon: Moon, tint: "#0f7a5c" },
  uang: { Icon: Wallet, tint: "#f59e0b" },
  berdua: { Icon: Heart, tint: "#ec4899" },
  kuliah: { Icon: GraduationCap, tint: "#8b5cf6" },
  nikah: { Icon: Gem, tint: "#b76e79" },
  sehat: { Icon: Droplets, tint: "#0ea5e9" },
};

export function bundleIcon(id: string): IconSpec {
  return BUNDLE[id] ?? { Icon: Zap, tint: "#94a3b8" };
}
