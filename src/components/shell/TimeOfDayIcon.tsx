"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";

export type DayPart = "dini" | "pagi" | "siang" | "sore" | "malam";

export function dayPart(h: number): DayPart {
  if (h < 4) return "dini";
  if (h < 11) return "pagi";
  if (h < 15) return "siang";
  if (h < 18) return "sore";
  return "malam";
}

/**
 * Interactive greeting icon beside the Beranda greeting. Enters calmly once
 * on mount and replays on tap or hover without an infinite animation loop.
 */
export function TimeOfDayIcon({ part }: { part: DayPart }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);

  return (
    <motion.button
      type="button"
      aria-label={`Suasana ${part}`}
      onClick={() => setBurst((n) => n + 1)}
      whileHover={reduce ? undefined : { scale: 1.12, rotate: part === "siang" ? 25 : -8 }}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      className="relative -my-2 -mx-1 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent"
      initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -24 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 20 }}
    >
      {part === "pagi" && (
        <motion.span
          key={`pagi-${burst}`}
          initial={reduce ? false : { y: 4, opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          <Sunrise size={23} strokeWidth={2.1} aria-hidden />
        </motion.span>
      )}
      {part === "siang" && (
        <motion.span
          key={`siang-${burst}`}
          initial={reduce ? false : { rotate: -45, scale: 0.85 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <Sun size={23} strokeWidth={2.1} aria-hidden />
        </motion.span>
      )}
      {part === "sore" && (
        <motion.span
          key={`sore-${burst}`}
          initial={reduce ? false : { y: -3, opacity: 0.7 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          <Sunset size={23} strokeWidth={2.1} aria-hidden />
        </motion.span>
      )}
      {(part === "malam" || part === "dini") && (
        <>
          <motion.span
            key={`malam-${burst}`}
            initial={reduce ? false : { rotate: -14 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
          >
            <Moon size={22} strokeWidth={2.1} aria-hidden />
          </motion.span>
          {[
            { cls: "right-1.5 top-2", size: 4, delay: 0.05 },
            { cls: "left-2 bottom-2.5", size: 3, delay: 0.12 },
          ].map((s, i) => (
            <motion.span
              key={`${burst}-${i}`}
              aria-hidden
              className={`absolute rounded-full bg-current ${s.cls}`}
              style={{ width: s.size, height: s.size }}
              initial={reduce ? false : { opacity: 0, scale: 0.4 }}
              animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.85], scale: [0.5, 1.25, 1] }}
              transition={{ duration: 0.45, delay: s.delay, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </>
      )}
    </motion.button>
  );
}
