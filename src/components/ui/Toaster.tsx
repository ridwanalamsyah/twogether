"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useToast } from "@/lib/toast";

export function Toaster() {
  const { text, tone, hide } = useToast();
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h,80px)+16px)] z-[95] flex justify-center px-4 md:bottom-8">
      <AnimatePresence>
        {text && (
          <motion.button
            key={text}
            type="button"
            onClick={hide}
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
            transition={reduce ? { duration: 0.08 } : { type: "spring", stiffness: 520, damping: 34 }}
            className={`pointer-events-auto min-h-[44px] max-w-[440px] rounded-2xl px-4 py-3 text-left text-[13px] font-semibold shadow-float ${
              tone === "danger"
                ? "bg-[color:var(--negative-bg)] text-[color:var(--negative)]"
                : tone === "warn"
                  ? "bg-[color:var(--warning-bg)] text-[color:var(--warning)]"
                  : "bg-bg-card text-text-1"
            }`}
          >
            {text}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
