"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
              role="tab"
              aria-selected={on}
              onClick={() => select(t.title)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ease-ios active:scale-95 ${
                on
                  ? "bg-accent text-accent-fg shadow-[0_6px_14px_-8px_var(--accent)]"
                  : "bg-bg-card text-text-3 shadow-card"
              }`}
            >
              {t.title}
            </button>
          );
        })}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="min-h-[50vh]"
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

  useIsoLayoutEffect(() => {
    register?.({ title, caption });
  }, [register, title, caption]);

  if (tabs) {
    if (tabs.active !== title) return null;
    return (
      <section
        className={`mt-4 ${tabs.dir === 1 ? "tab-in-right" : "tab-in-left"}`}
      >
        {(caption || action) && (
          <div className="mb-3 flex min-h-[28px] items-center justify-between gap-3">
            <div className="text-[12px] text-text-3">{caption}</div>
            <div className="flex items-center gap-2">{action}</div>
          </div>
        )}
        {children}
      </section>
    );
  }

  return (
    <section className="mt-6 first:mt-4">
      <div className="mb-2 flex items-end justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="text-left active:opacity-50"
        >
          <div className="text-[11px] font-medium section-label text-text-4">
            {title}
          </div>
          {caption && (
            <div className="text-[11px] text-text-4">{caption}</div>
          )}
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button
            onClick={() => setOpen(!open)}
            className="text-[11px] text-text-3 active:opacity-50"
          >
            {open ? "Tutup" : "Buka"}
          </button>
        </div>
      </div>
      {open && children}
    </section>
  );
}

export function ListBox({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border rounded-[20px] bg-bg-card px-4 shadow-card">
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border-2 border-dashed border-border py-8 text-center text-[13px] text-text-3">
      {children}
    </div>
  );
}

export function AccentBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-[0_6px_14px_-8px_var(--accent)] active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] text-text-3 active:opacity-50"
    >
      {children}
    </button>
  );
}
