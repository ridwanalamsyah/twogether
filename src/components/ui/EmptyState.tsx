"use client";

/**
 * Minimalist empty state — no emoji decoration. The `emoji` prop is accepted
 * for backwards compatibility but ignored visually.
 */
export function EmptyState({
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
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-[14px] font-medium text-text-1">{title}</div>
      {body && (
        <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-text-3">
          {body}
        </p>
      )}
      {cta && onCta && (
        <button
          onClick={onCta}
          className="mt-4 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
