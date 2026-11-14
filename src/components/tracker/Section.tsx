"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { hapticTap } from "@/lib/haptic";

/* ───────────────────────── Section tabs ─────────────────────────
 * Pages like Kita / Sehat / Rumah used to stack 4–8 collapsible sections
 * on top of each other. Wrapping them in <SectionTabs> turns every
 * <Section> into a tab: one topic on screen at a time, a scrollable
 * segmented bar on top, swipe left/right to move between them.
 * Sections stay mounted while hidden, so half-typed forms survive a
 * tab switch.
 */

interface TabMeta {
  title: string;
  caption?: string;
}

interface TabsCtx {
  register: (meta: TabMeta) => void;
  active: string | null;
  dir: 1 | -1;
}

const SectionTabsContext = createContext<TabsCtx | null>(null);

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(`twogether:tab:${key}`);
  } catch {
    return null;
  }
}

export function SectionTabs({
  storageKey,
  children,
}: {
  /** Remembers the last opened tab per page. */
  storageKey: string;
  children: ReactNode;
}) {
  const [tabs, setTabs] = useState<TabMeta[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const barRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const register = useCallback((meta: TabMeta) => {
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.title === meta.title);
      if (i === -1) return [...prev, meta];
      if (prev[i].caption === meta.caption) return prev;
      const next = [...prev];
      next[i] = meta;
      return next;
    });
  }, []);

  // Pick the initial tab once sections have registered.
  useEffect(() => {
    if (active || tabs.length === 0) return;
    const stored = readStored(storageKey);
    setActive(tabs.some((t) => t.title === stored) ? stored : tabs[0].title);
  }, [tabs, active, storageKey]);

  const select = useCallback(
    (title: string) => {
      if (title === active) return;
      const from = tabs.findIndex((t) => t.title === active);
      const to = tabs.findIndex((t) => t.title === title);
      setDir(to >= from ? 1 : -1);
      setActive(title);
      hapticTap();
      try {
        localStorage.setItem(`twogether:tab:${storageKey}`, title);
      } catch {
        /* private mode */
      }
    },
    [active, tabs, storageKey],
  );

  // Keep the active chip in view.
  useEffect(() => {
    const bar = barRef.current;
    const el = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!bar || !el) return;
    const left = el.offsetLeft - bar.clientWidth / 2 + el.clientWidth / 2;
    bar.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  // Horizontal swipe on the content switches tabs.
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, ok: !insideScrollableX(e.target) };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start?.ok) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const i = tabs.findIndex((tab) => tab.title === active);
    const next = tabs[i + (dx < 0 ? 1 : -1)];
    if (next) select(next.title);
  }

  return (
    <SectionTabsContext.Provider value={{ register, active, dir }}>
      <div
        ref={barRef}
        role="tablist"
        className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 pt-3"
      >
        {tabs.map((t) => {
          const on = t.title === active;
          return (
            <button
              key={t.title}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => select(t.title)}
              className={`relative z-0 min-h-[44px] shrink-0 overflow-hidden rounded-full px-4 py-2 text-[14px] font-medium transition-transform duration-150 active:scale-95 ${
                on
                  ? "text-bg-app"
                  : "bg-bg-card text-text-2 ring-1 ring-[color:var(--hairline)]"
              }`}
            >
              {on && (
                <motion.span
                  layoutId={`sec-tab-${storageKey}`}
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-text-1"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 36 }
                  }
                />
              )}
              {t.title}
            </button>
          );
        })}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative min-h-[50vh]"
      >
        {children}
      </div>
    </SectionTabsContext.Provider>
  );
}

function insideScrollableX(target: EventTarget | null): boolean {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== document.body) {
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
    if (el.scrollWidth > el.clientWidth + 2) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function Section({
  title,
  caption,
  action,
  children,
  defaultOpen = false,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tabs = useContext(SectionTabsContext);
  const register = tabs?.register;
  const reduced = useReducedMotion();

  useIsoLayoutEffect(() => {
    register?.({ title, caption });
  }, [register, title, caption]);

  if (tabs) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        {tabs.active === title && (
          <motion.section
            key={title}
            initial={reduced ? false : { opacity: 0, x: tabs.dir * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: reduced ? 0.04 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4"
          >
            {(caption || action) && (
              <div className="mb-3 flex min-h-[28px] items-center justify-between gap-3">
                <div className="text-[13px] text-text-3">{caption}</div>
                <div className="flex items-center gap-2">{action}</div>
              </div>
            )}
            {children}
          </motion.section>
        )}
      </AnimatePresence>
    );
  }

  return (
    <section className="mt-6 first:mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="min-h-[44px] py-1 text-left active:opacity-50"
        >
          <div className="text-[12px] font-medium section-label text-text-3">
            {title}
          </div>
          {caption && (
            <div className="text-[12px] text-text-4">{caption}</div>
          )}
        </button>
        <div className="flex items-center gap-1">
          {action}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="min-h-[44px] px-2 text-[12px] font-medium text-text-3 active:opacity-50"
          >
            {open ? "Tutup" : "Buka"}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0.04 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function ListBox({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-[color:var(--hairline)] rounded-[20px] border border-[color:var(--hairline)] bg-bg-card px-4 shadow-card">
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] bg-bg-elev1 px-6 py-9 text-center text-[14px] leading-relaxed text-text-3">
      {children}
    </div>
  );
}

export function AccentBtn({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      {...props}
      className={`grid h-11 min-w-11 shrink-0 place-items-center rounded-full bg-accent px-3.5 text-[14px] font-semibold text-accent-fg transition-transform active:scale-95 disabled:bg-bg-elev3 disabled:text-text-4 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center px-2 text-[13px] font-medium text-text-3 active:opacity-50 ${className}`.trim()}
    >
      {children}
    </button>
  );
}
