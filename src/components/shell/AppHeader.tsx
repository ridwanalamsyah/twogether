"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/search/GlobalSearch";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Small line above the title (e.g. today's date on Beranda). */
  eyebrow?: string;
  actions?: React.ReactNode;
}

/**
 * Minimalist sticky header. Single-line title with optional faint subtitle
 * underneath. No avatar circle — settings is reachable from bottom nav.
 */
export function AppHeader({ title, subtitle, eyebrow, actions }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

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
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-0.5 truncate text-[12px] font-semibold text-accent">
              {eyebrow}
            </div>
          )}
          <h1
            className={`${
              eyebrow ? "line-clamp-2 text-[24px]" : "truncate text-[22px]"
            } font-extrabold leading-tight tracking-[-0.03em] text-text-1`}
          >
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 truncate text-[12px] text-text-3">
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Cari"
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-3 hover:bg-bg-elev2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4 w-4"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
          </button>
          {actions}
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-3 hover:bg-bg-elev2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
