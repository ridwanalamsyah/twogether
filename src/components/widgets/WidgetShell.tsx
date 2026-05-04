"use client";

import { cn } from "@/lib/utils";

interface WidgetShellProps {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function WidgetShell({
  title,
  action,
  className,
  children,
}: WidgetShellProps) {
  return (
    <div
      className={cn(
        "surface theme-transition slide-up overflow-hidden",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1.5">
          {title && (
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-4">
              {title}
            </div>
          )}
          {action}
        </div>
      )}
      <div className="px-4 pb-3.5">{children}</div>
    </div>
  );
}
