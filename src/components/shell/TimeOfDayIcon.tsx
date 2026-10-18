"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sparkle, Sun, Sunrise, Sunset } from "lucide-react";

export type DayPart = "dini" | "pagi" | "siang" | "sore" | "malam";

export function dayPart(h: number): DayPart {
  if (h < 4) return "dini";
  if (h < 11) return "pagi";
  if (h < 15) return "siang";
  if (h < 18) return "sore";
  return "malam";
}

/**
 * Small living icon beside the Beranda greeting: the sun rises in the
 * morning, turns slowly at noon, sinks in the afternoon, and the moon
 * sways with twinkling stars at night. Loops are slow so it stays calm.
 */
export function TimeOfDayIcon({ part }: { part: DayPart }) {
  const reduce = useReducedMotion();
  const loop = { repeat: Infinity, ease: "easeInOut" } as const;

  return (
    <motion.span
      aria-hidden
      className="relative inline-grid h-7 w-7 shrink-0 place-items-center text-accent"
      initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
    >
      {part === "pagi" && (
        <motion.span
          animate={reduce ? undefined : { y: [3, -1, 3] }}
          transition={{ ...loop, duration: 4 }}
        >
          <Sunrise size={24} strokeWidth={2.1} />
        </motion.span>
      )}
      {part === "siang" && (
        <motion.span
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, ease: "linear", duration: 18 }}
        >
          <Sun size={24} strokeWidth={2.1} />
        </motion.span>
      )}
      {part === "sore" && (
        <motion.span
          animate={reduce ? undefined : { y: [-1, 3, -1] }}
          transition={{ ...loop, duration: 4.5 }}
        >
          <Sunset size={24} strokeWidth={2.1} />
        </motion.span>
      )}
      {(part === "malam" || part === "dini") && (
        <>
          <motion.span
            animate={reduce ? undefined : { rotate: [-10, 8, -10] }}
            transition={{ ...loop, duration: 5 }}
          >
            <Moon size={22} strokeWidth={2.1} />
          </motion.span>
          {[
            { cls: "-right-1.5 -top-1", size: 10, delay: 0 },
            { cls: "-left-1 bottom-0", size: 8, delay: 1.1 },
          ].map((s, i) => (
            <motion.span
              key={i}
              className={`absolute ${s.cls}`}
              animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.7, 1.1, 0.7] }}
              transition={{ ...loop, duration: 2.4, delay: s.delay }}
            >
              <Sparkle size={s.size} strokeWidth={2.4} fill="currentColor" />
            </motion.span>
          ))}
        </>
      )}
    </motion.span>
  );
}
