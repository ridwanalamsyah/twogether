"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ITEMS, isActive } from "@/components/shell/BottomNav";
import { FEATURES, tintBg } from "@/data/features";
import { useFeatures } from "@/stores/features";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";

/**
 * iPad & laptop navigation (≥768px). Same destinations as the phone tab
 * bar, plus the couple's own spaces listed underneath — like a Notion
 * sidebar, so everything is one click away on a big screen.
 */
export function Sidebar() {
  const pathname = usePathname();
  const enabled = useFeatures((s) => s.enabled);
  const name = useAuth((s) => s.name);
  const openCapture = useUi((s) => s.openCapture);
  const spaces = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f));

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col px-3 pb-4 pt-[calc(var(--sat)+18px)] md:flex">
      <Link href="/home" className="mb-5 flex items-center gap-2.5 px-2">
        <span
          className="grid h-9 w-9 place-items-center rounded-xl text-accent-fg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <svg viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="3" className="h-6 w-6" aria-hidden>
            <circle cx="17" cy="22" r="10" />
            <circle cx="27" cy="22" r="10" />
          </svg>
        </span>
        <span className="text-[17px] font-extrabold tracking-tight text-text-1">Twogether</span>
      </Link>

      <button
        onClick={openCapture}
        className="mb-4 flex items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-bold text-accent-fg shadow-[0_8px_18px_-10px_var(--accent)] active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
      >
        <span className="text-[18px] leading-none">＋</span> Catat cepat
      </button>

      <nav className="space-y-0.5">
        {ITEMS.map((item) => (
          <SideLink
            key={item.href}
            href={item.href}
            active={isActive(pathname, item)}
            icon={<span className="block h-[20px] w-[20px] [&>svg]:h-full [&>svg]:w-full">{item.icon}</span>}
            label={item.label}
          />
        ))}
      </nav>

      <div className="mb-1.5 mt-6 px-3 text-[12px] font-semibold text-text-4">Ruang kalian</div>
      <nav className="no-scrollbar -mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
        {spaces.map((f) => (
          <SideLink
            key={f.href}
            href={f.href}
            active={pathname === f.href || !!pathname?.startsWith(f.href + "/")}
            icon={
              <span
                className="grid h-6 w-6 place-items-center rounded-lg text-[14px] leading-none"
                style={{ background: tintBg(f.tint, 18) }}
              >
                {f.emoji}
              </span>
            }
            label={f.title}
          />
        ))}
        <Link
          href="/fitur"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] text-text-3 hover:bg-bg-elev1"
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg border border-dashed border-border-strong text-[13px]">
            +
          </span>
          Tambah ruang
        </Link>
      </nav>

      <Link
        href="/settings"
        className={cn(
          "mt-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-bg-elev1",
          pathname?.startsWith("/settings") && "bg-bg-elev1",
        )}
      >
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold text-accent-fg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          {(name || "T")[0]?.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-text-1">{name || "Kamu"}</span>
          <span className="block text-[12px] text-text-4">Pengaturan</span>
        </span>
      </Link>
    </aside>
  );
}

function SideLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors",
        active ? "font-semibold text-accent" : "text-text-2 hover:bg-bg-elev1",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-accent-soft"
          transition={{ type: "spring", stiffness: 520, damping: 40 }}
        />
      )}
      <span className="relative flex shrink-0 items-center">{icon}</span>
      <span className="relative truncate">{label}</span>
    </Link>
  );
}
