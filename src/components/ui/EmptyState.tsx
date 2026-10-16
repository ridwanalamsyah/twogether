"use client";

import { BookOpen, CircleCheck, Luggage, Mail, Search, Sparkles, Target, type LucideIcon } from "lucide-react";
import { IconTile } from "@/lib/icons";

/** The old emoji prop still picks the picture, drawn as a crisp line icon. */
const ICONS: Record<string, { Icon: LucideIcon; tint: string }> = {
  "💌": { Icon: Mail, tint: "#f43f5e" },
  "🔎": { Icon: Search, tint: "#64748b" },
  "🧳": { Icon: Luggage, tint: "#06b6d4" },
  "🎯": { Icon: Target, tint: "#22c55e" },
  "📝": { Icon: BookOpen, tint: "#a855f7" },
  "✅": { Icon: CircleCheck, tint: "#84cc16" },
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
  const spec = (emoji && ICONS[emoji]) || { Icon: Sparkles, tint: "#94a3b8" };
  return (
    <div className="surface flex flex-col items-center px-6 py-8 text-center">
      <IconTile spec={spec} size={60} radius={20} />
      <div className="mt-3 text-[17px] font-semibold text-text-1">{title}</div>
      {body && <p className="mx-auto mt-1 max-w-[300px] text-[14px] leading-relaxed text-text-3">{body}</p>}
      {cta && onCta && (
        <button onClick={onCta} className="btn-accent mt-5 w-full max-w-[300px]">
          {cta}
        </button>
      )}
    </div>
  );
}
