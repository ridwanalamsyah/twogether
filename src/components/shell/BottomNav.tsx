"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import { QuickCapture } from "@/components/shell/QuickCapture";

interface NavItem {
  href: string;
  label: string;
  /** Extra route prefixes that should light this tab up. */
  match: string[];
  icon: React.ReactNode;
}

const ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Beranda",
    match: ["/home", "/settings"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 11l9-7 9 7" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M5 10v9h14v-9" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/tracker",
    label: "Uang",
    match: ["/tracker", "/uang", "/goals", "/grafik", "/insights"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="6" width="18" height="13" rx="2.5" />
        <path d="M3 10h18" />
        <path d="M16 15h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/kita",
    label: "Kita",
    match: ["/kita", "/moments", "/wrapped", "/pencapaian"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/fitur",
    label: "Jelajah",
    match: [
      "/fitur",
      "/sehat",
      "/belajar",
      "/jadwal",
      "/calendar",
      "/rumah",
      "/list",
      "/habits",
      "/reflection",
      "/travel",
      "/skripsi",
      "/digest",
    ],
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
      </svg>
    ),
  },
];

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  return item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export function BottomNav() {
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  return (
    <>
      <nav className="fixed -bottom-[var(--nav-bottom-offset)] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-bg-app/90 pb-[var(--nav-bottom-pad)] backdrop-blur-xl backdrop-saturate-150">
        <ul className="grid h-[var(--nav-content-h)] grid-cols-5">
          {left.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item)}
            />
          ))}
          <li className="flex items-center justify-center">
            <button
              type="button"
              aria-label="Catat cepat"
              onClick={() => {
                hapticTap();
                setCaptureOpen(true);
              }}
              className="grid h-11 w-11 place-items-center rounded-[14px] bg-accent text-accent-fg shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] transition-transform duration-150 ease-ios active:scale-90"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </li>
          {right.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item)}
            />
          ))}
        </ul>
      </nav>
      <QuickCapture open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li className="flex">
      <Link
        href={item.href}
        onClick={() => {
          if (!active) hapticTap();
        }}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] leading-none transition-colors duration-200 active:opacity-70",
          active ? "text-text-1" : "text-text-4",
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-active-pill"
            className="absolute top-[5px] h-[30px] w-[52px] rounded-full bg-bg-elev2"
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
          />
        )}
        <motion.span
          className="relative h-[21px] w-[21px]"
          animate={{ scale: active ? 1.06 : 1, y: active ? -1 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {item.icon}
        </motion.span>
        <span
          className={cn("relative", active ? "font-semibold" : "font-medium")}
        >
          {item.label}
        </span>
      </Link>
    </li>
  );
}
