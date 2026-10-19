"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

const TRIGGER = 72;
const HOLD = 56;
const MAX = 120;

/**
 * Is the page (and every scroll box around the finger) at its very top?
 * The page scrolls on window in the browser but on a `body > div` in the
 * installed PWA / app — and that div isn't body's first child (Next adds a
 * hidden one), so walk up from the touched element instead of guessing.
 */
function atTop(from: EventTarget | null): boolean {
  if (window.scrollY > 0) return false;
  for (let el = from as HTMLElement | null; el && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollTop > 0) return false;
  }
  return true;
}

/**
 * Pull the page down from the top: a heart fills as you pull, beats while
 * syncing, then the page springs back. Transform is only set while pulling
 * so `position: fixed` children are never trapped.
 */
export function PullToRefresh({
  onRefresh,
  disabled,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  /** E.g. while cards are being dragged around. */
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const y = useMotionValue(0);
  const fill = useTransform(y, [12, TRIGGER], [0, 1]);
  const iconOpacity = useTransform(y, [0, 24], [0, 1]);
  const iconRotate = useTransform(y, [0, TRIGGER], [-90, 0]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let startY: number | null = null;
    let armed = false;

    if (disabled) return;

    function onStart(e: TouchEvent) {
      if (busyRef.current || e.touches.length !== 1 || !atTop(e.target)) return;
      // Ignore pulls that start inside a sheet or dialog.
      if ((e.target as HTMLElement).closest("[role=dialog], .fixed")) return;
      startY = e.touches[0].clientY;
      armed = false;
    }
    function onMove(e: TouchEvent) {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || !atTop(e.target)) {
        y.set(0);
        return;
      }
      // Rubber band: the further you pull, the harder it gets.
      const pulled = Math.min(MAX, dy * 0.5);
      y.set(pulled);
      if (!armed && pulled >= TRIGGER) {
        armed = true;
        hapticTap();
      } else if (armed && pulled < TRIGGER) {
        armed = false;
      }
    }
    async function onEnd() {
      if (startY === null) return;
      startY = null;
      if (!armed) {
        animate(y, 0, { type: "spring", stiffness: 420, damping: 34 });
        return;
      }
      busyRef.current = true;
      setBusy(true);
      animate(y, HOLD, { type: "spring", stiffness: 420, damping: 34 });
      const minWait = new Promise((r) => setTimeout(r, 800));
      try {
        await Promise.all([onRefresh(), minWait]);
      } catch {
        /* offline or backend down: the data on the phone is still fine */
      }
      hapticSuccess();
      busyRef.current = false;
      setBusy(false);
      animate(y, 0, { type: "spring", stiffness: 380, damping: 30 });
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
  }, [onRefresh, disabled, y]);

  return (
    <div className="relative">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[calc(var(--header-top-pad,0px)+4px)] z-30 flex justify-center"
        style={{ opacity: iconOpacity }}
      >
        <motion.span
          className="relative grid h-10 w-10 place-items-center rounded-full bg-bg-elev2 text-accent shadow-card"
          style={{ rotate: iconRotate }}
          animate={busy ? { scale: [1, 1.18, 1, 1.1, 1] } : { scale: 1 }}
          transition={busy ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        >
          <Heart size={20} strokeWidth={2.2} className="absolute" />
          <motion.span className="absolute grid place-items-center" style={{ scale: fill, opacity: fill }}>
            <Heart size={20} strokeWidth={2.2} fill="currentColor" />
          </motion.span>
        </motion.span>
      </motion.div>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
