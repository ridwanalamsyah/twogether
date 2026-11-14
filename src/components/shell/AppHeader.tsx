"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Search, Settings } from "lucide-react";
import { goBack, isTabRoot } from "@/lib/nav";
import { hapticTap } from "@/lib/haptic";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { OfflineBanner } from "@/components/shell/OfflineBanner";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Small line above the title (e.g. today's date on Beranda). */
  eyebrow?: string;
  actions?: React.ReactNode;
  /** Small decoration after the title (Beranda's time-of-day icon). */
  titleIcon?: React.ReactNode;
}

/**
 * Minimalist sticky header. Single-line title with optional faint subtitle
 * underneath, plus inline offline banner when connectivity drops.
 */
export function AppHeader({ title, subtitle, eyebrow, actions, titleIcon }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname() ?? "";
  // Tabs are top level; every other page gets a way back besides the edge swipe.
  const showBack = !isTabRoot(pathname);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="app-header sticky top-0 z-20 px-5 pt-[var(--header-top-pad)] pb-3 theme-transition md:px-8 md:pt-6">
      <div className="flex items-center justify-between gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => {
              hapticTap();
              goBack(router);
            }}
            aria-label="Kembali"
            className="-ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-1 transition-transform active:scale-90 active:bg-bg-elev2"
          >
            <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-0.5 truncate text-[12px] font-semibold text-accent">
              {eyebrow}
            </div>
          )}
          <div className="flex items-center gap-1">
            <h1
              className={`${
                eyebrow ? "truncate text-[20px] sm:text-[23px]" : "truncate text-[22px]"
              } min-w-0 font-bold leading-tight tracking-tight text-text-1`}
            >
              {title}
            </h1>
            {titleIcon}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-[12px] text-text-3">
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              hapticTap();
              setSearchOpen(true);
            }}
            aria-label="Cari"
            className="grid h-11 w-11 place-items-center rounded-full text-text-3 transition-transform hover:bg-bg-elev2 active:scale-90"
          >
            <Search size={19} strokeWidth={2} aria-hidden="true" />
          </button>
          {actions}
          {/* Sub-pages already have the back button; the gear there only
              crowded the title off the screen. */}
          {!showBack && (
            <Link
              href="/settings"
              onClick={() => hapticTap()}
              aria-label="Pengaturan"
              className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-text-3 transition-transform hover:bg-bg-elev2 active:scale-90"
            >
              <Settings size={19} strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <OfflineBanner />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
