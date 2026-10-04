"use client";

import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { hapticTap, hapticWarn } from "@/lib/haptic";

const ACTION_W = 84;

/**
 * iOS-style row: swipe left to reveal a destructive action. Replaces the
 * old hover-only "×" buttons, which were invisible on phones.
 */
export function SwipeRow({
  children,
  onDelete,
  label = "Hapus",
}: {
  children: React.ReactNode;
  onDelete: () => void;
  label?: string;
}) {
  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-ACTION_W, -20, 0], [1, 0.4, 0]);
  const [open, setOpen] = useState(false);
  const removing = useRef(false);

  function settle(to: number) {
    animate(x, to, { type: "spring", stiffness: 520, damping: 42 });
    setOpen(to !== 0);
  }

  return (
    <div className="relative overflow-hidden">
      <motion.button
        type="button"
        style={{ opacity: actionOpacity, width: ACTION_W }}
        onClick={() => {
          if (removing.current) return;
          removing.current = true;
          hapticWarn();
          onDelete();
        }}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[color:var(--negative)] text-[13px] font-semibold text-white"
        aria-label={label}
        tabIndex={open ? 0 : -1}
      >
        {label}
      </motion.button>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTION_W, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          const shouldOpen = info.offset.x < -ACTION_W / 2 || info.velocity.x < -400;
          if (shouldOpen && !open) hapticTap();
          settle(shouldOpen ? -ACTION_W : 0);
        }}
        onClickCapture={(e) => {
          // A tap on an open row closes it instead of triggering the row.
          if (open) {
            e.stopPropagation();
            settle(0);
          }
        }}
        className="relative bg-bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
