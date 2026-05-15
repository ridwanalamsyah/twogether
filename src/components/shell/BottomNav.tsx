"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l9-7 9 7" strokeLinejoin="round" />
        <path d="M5 10v9h14v-9" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/tracker",
    label: "Tracker",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12l4-7 4 12 4-7 6 4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "Goals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/moments",
    label: "Moments",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7-5-7-11a7 7 0 0114 0c0 6-7 11-7 11z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-bg-app/95 pb-[var(--nav-bottom-pad)] pt-1 backdrop-blur-xl theme-transition">
      <ul className="grid h-[var(--nav-content-h)] grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                  active ? "text-text-1" : "text-text-4",
                )}
              >
                <span className="h-[20px] w-[20px]">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
