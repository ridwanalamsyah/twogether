"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { goBack, isTabRoot, pageStack as stack } from "@/lib/nav";
import { hapticTap } from "@/lib/haptic";

/**
 * Re-mounts on every route change inside the app shell, giving each page an
 * iOS-like enter transition: opening a menu slides in from the right, going
 * back slides in from the left, switching tabs is a soft fade. From any
 * page that isn't a tab, swiping from the left edge goes back.
 *
 * The keyframes only use `backwards` fill and the drag transform is cleared
 * afterwards — a leftover transform would turn this wrapper into the
 * containing block for `position: fixed` sheets.
 */

let swipedBack = false;
// Dev StrictMode calls state initialisers twice; answer the repeat from cache.
let last: { path: string; kind: Kind } | null = null;

type Kind = "fade" | "push" | "back" | "none";

function kindFor(path: string): Kind {
  if (last?.path === path) return last.kind;
  const kind = computeKind(path);
  last = { path, kind };
  return kind;
}

function computeKind(path: string): Kind {
  if (swipedBack) {
    swipedBack = false;
    stack.pop();
    // Swiped back from a deep-linked page: goBack pushed its tab, which is
    // now the only page in the stack.
    if (stack.length === 0) stack.push(path);
    return "none";
  }
  if (stack.length === 0) {
    stack.push(path);
    return "fade";
  }
  if (stack[stack.length - 1] === path) return "fade";
  if (stack[stack.length - 2] === path) {
    stack.pop();
    return "back";
  }
  if (isTabRoot(path)) {
    stack.length = 0;
    stack.push(path);
    return "fade";
  }
  stack.push(path);
  return "push";
}

const CLASS: Record<Kind, string> = {
  fade: "page-enter",
  push: "page-push",
  back: "page-back",
  none: "page-swiped",
};

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [kind] = useState(() => kindFor(pathname));
  const canSwipe = !isTabRoot(pathname);
  useEdgeSwipeBack(canSwipe);

  return <div className={CLASS[kind]} data-page>{children}</div>;
}

function useEdgeSwipeBack(enabled: boolean) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!enabled) return;
    const page = () => document.querySelector<HTMLElement>("[data-page]");
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let tracking = false;
    let dragging = false;

    function reset(el: HTMLElement | null) {
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      el.style.boxShadow = "";
    }

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > 24) return;
      if ((e.target as HTMLElement).closest(".fixed")) return;
      tracking = true;
      dragging = false;
      startX = lastX = t.clientX;
      startY = t.clientY;
      lastT = e.timeStamp;
      velocity = 0;
    }
    function onMove(e: TouchEvent) {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!dragging) {
        // Mostly vertical: it's a scroll, let it be.
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          tracking = false;
          return;
        }
        if (dx < 8) return;
        dragging = true;
      }
      const dt = Math.max(1, e.timeStamp - lastT);
      velocity = (t.clientX - lastX) / dt;
      lastX = t.clientX;
      lastT = e.timeStamp;
      const el = page();
      if (el) {
        el.style.transition = "none";
        el.style.transform = `translate3d(${Math.max(0, dx)}px,0,0)`;
        el.style.boxShadow = "-12px 0 32px -12px rgba(0,0,0,0.35)";
      }
    }
    function onEnd() {
      if (!tracking) return;
      tracking = false;
      const el = page();
      if (!dragging || !el) return reset(el);
      const dx = lastX - startX;
      const width = window.innerWidth;
      if (dx > width * 0.33 || velocity > 0.5) {
        el.style.transition = "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = `translate3d(${width}px,0,0)`;
        hapticTap();
        swipedBack = true;
        setTimeout(() => {
          goBack(routerRef.current);
        }, 180);
      } else {
        el.style.transition = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "translate3d(0,0,0)";
        setTimeout(() => reset(el), 270);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);
}
