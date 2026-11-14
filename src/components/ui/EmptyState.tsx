"use client";

import { BookOpen, CircleCheck, Inbox, Luggage, Mail, Search, Target, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { IconTile } from "@/lib/icons";

/** Semantic tint CSS variable mapping so icons match the design system without hex literals. */
const ICONS: Record<string, { Icon: LucideIcon; tint: string }> = {
  "💌": { Icon: Mail, tint: "var(--tint-rose)" },
  "🔎": { Icon: Search, tint: "var(--tint-stone)" },
  "🧳": { Icon: Luggage, tint: "var(--tint-cyan)" },
  "🎯": { Icon: Target, tint: "var(--tint-green)" },
  "📝": { Icon: BookOpen, tint: "var(--tint-purple)" },
  "✅": { Icon: CircleCheck, tint: "var(--tint-lime)" },
};

export function EmptyState({
  emoji,
  title,
  body,
  cta,
  onCta,
}: {
  emoji?: string;
  title: string;
  body?: string;
  cta?: string;
  onCta?: () => void;
}) {
  const reduce = useReducedMotion();
  const spec = (emoji && ICONS[emoji]) || { Icon: Inbox, tint: "var(--tint-slate)" };
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.08 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="surface flex flex-col items-center px-6 py-8 text-center"
    >
      <IconTile spec={spec} size={60} radius={20} />
      <div className="mt-3 text-[17px] font-semibold text-text-1">{title}</div>
      {body && <p className="mx-auto mt-1 max-w-[300px] text-[14px] leading-relaxed text-text-3">{body}</p>}
      {cta && onCta && (
        <button type="button" onClick={onCta} className="btn-accent mt-5 w-full max-w-[300px]">
          {cta}
        </button>
      )}
    </motion.div>
  );
}
