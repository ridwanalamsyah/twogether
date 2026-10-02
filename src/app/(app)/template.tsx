"use client";

/**
 * Re-mounts on every route change inside the app shell, giving each page a
 * short, GPU-friendly enter transition. The keyframes only use `backwards`
 * fill so no transform lingers afterwards — a leftover transform would turn
 * this wrapper into the containing block for `position: fixed` sheets.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
