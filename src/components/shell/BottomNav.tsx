"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import { useUi, type CaptureAction } from "@/stores/ui";
import { useEffect, useState } from "react";
import { Camera, House, Heart, LayoutGrid, Mic, PenLine, Plus, Wallet } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Extra route prefixes that should light this tab up. */
  match: string[];
  icon: React.ReactNode;
}

export const ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Beranda",
    match: ["/home", "/settings"],
    icon: <House size={21} strokeWidth={2} />,
  },
  {
    href: "/tracker",
    label: "Uang",
    match: ["/tracker", "/uang", "/goals", "/insights", "/patungan", "/dompet", "/laporan", "/impor", "/zakat", "/tagihan", "/aset"],
    icon: <Wallet size={21} strokeWidth={2} />,
  },
  {
    href: "/kita",
    label: "Kita",
    match: ["/kita", "/moments", "/wrapped", "/pencapaian", "/nikah", "/kabar", "/tantangan"],
    icon: <Heart size={21} strokeWidth={2} />,
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
      "/catatan",
      "/shalat",
      "/siklus",
      "/belanja",
      "/hijriah",
      "/ramadhan",
      "/tilawah",
      "/target",
      "/fokus",
    ],
    icon: <LayoutGrid size={21} strokeWidth={2} />,
  },
];

export function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  return item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

const ACTIONS: { id: CaptureAction; label: string; Icon: typeof Plus; x: number; y: number }[] = [
  { id: "manual", label: "Catat", Icon: PenLine, x: -78, y: -78 },
  { id: "scan", label: "Struk", Icon: Camera, x: 0, y: -108 },
  { id: "voice", label: "Suara", Icon: Mic, x: 78, y: -78 },
];

export function BottomNav() {
  const pathname = usePathname();
  const openCapture = useUi((s) => s.openCapture);
  const [menu, setMenu] = useState(false);
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  useEffect(() => setMenu(false), [pathname]);

  function pick(a: CaptureAction) {
    hapticTap();
    setMenu(false);
    openCapture(a);
  }

  return (
    <>
      <AnimatePresence>
        {menu && (
          <motion.button
            key="scrim"
            aria-label="Tutup"
            onClick={() => setMenu(false)}
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
      <nav className="md:hidden fixed -bottom-[var(--nav-bottom-offset)] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-3 pb-[var(--nav-bottom-pad)]">
        <div className="app-nav relative mb-1.5 rounded-[26px]">
          <ul className="grid h-[var(--nav-content-h)] grid-cols-5">
            {left.map((item) => (
              <NavLink key={item.href} item={item} side="left" active={isActive(pathname, item)} />
            ))}
            <li className="relative flex items-center justify-center">
              <span className="pointer-events-none absolute left-1/2 top-[calc(50%-14px)] h-0 w-0">
              <AnimatePresence>
                {menu &&
                  ACTIONS.map((a, i) => (
                    <motion.button
                      key={a.id}
                      type="button"
                      onClick={() => pick(a.id)}
                      aria-label={a.label}
                      className="pointer-events-auto absolute -left-[27px] -top-[27px] flex w-[54px] flex-col items-center gap-1.5"
                      initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                      animate={{ x: a.x, y: a.y, scale: 1, opacity: 1 }}
                      exit={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 30, delay: i * 0.03 }}
                    >
                      <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-bg-card text-text-1 shadow-float ring-1 ring-[color:var(--hairline)]">
                        <a.Icon size={22} strokeWidth={2} />
                      </span>
                      <span className="text-[11px] font-semibold text-white drop-shadow">{a.label}</span>
                    </motion.button>
                  ))}
              </AnimatePresence>
              </span>
              <button
                type="button"
                aria-label={menu ? "Tutup menu catat" : "Catat cepat"}
                aria-expanded={menu}
                onClick={() => {
                  hapticTap();
                  setMenu((v) => !v);
                }}
                className="relative z-10 -mt-7 grid h-[56px] w-[56px] place-items-center rounded-full bg-accent text-accent-fg shadow-float ring-[5px] ring-[color:var(--bg-app)] transition-transform duration-150 ease-ios active:scale-90"
              >
                <motion.span animate={{ rotate: menu ? 45 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
                  <Plus size={24} strokeWidth={2.4} />
                </motion.span>
              </button>
            </li>
            {right.map((item) => (
              <NavLink key={item.href} item={item} side="right" active={isActive(pathname, item)} />
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}

// Each tab icon greets you its own way when picked; every keyframe list
// ends slightly lifted so the active tab still reads as active.
const ICON_MOTION: Record<string, { scale?: number[]; y?: number[]; rotate?: number[] }> = {
  "/home": { y: [0, -6, 0, -2.5, -1], scale: [1, 1.04, 1, 1.03, 1.06] },
  "/tracker": { rotate: [0, -14, 10, -4, 0], scale: [1, 1.1, 1.06, 1.06, 1.06], y: [0, -1, -1, -1, -1] },
  "/kita": { scale: [1, 1.32, 0.94, 1.16, 1.06], y: [0, -1, -1, -1, -1] },
  "/fitur": { rotate: [0, 90], scale: [1, 0.86, 1.06], y: [0, -1, -1] },
};

function NavLink({ item, active, side }: { item: NavItem; active: boolean; side: "left" | "right" }) {
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
          // The pill slides between neighbours but never across the + button
          // (it used to show through it going Uang ⇄ Kita): each side has its
          // own pill, and switching sides pops it in place instead.
          <motion.span
            layoutId={`nav-active-pill-${side}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-[7px] h-[30px] w-[54px] rounded-full bg-bg-elev2"
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
          />
        )}
        <motion.span
          className="relative h-[21px] w-[21px]"
          animate={active ? ICON_MOTION[item.href] ?? { scale: 1.06, y: -1 } : { scale: 1, y: 0, rotate: 0 }}
          transition={
            active
              ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              : { type: "spring", stiffness: 500, damping: 30 }
          }
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
