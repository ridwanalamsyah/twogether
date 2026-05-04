"use client";

import { useState, type ReactNode } from "react";

export function Section({
  title,
  caption,
  action,
  children,
  defaultOpen = false,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-6 first:mt-4">
      <div className="mb-2 flex items-end justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="text-left active:opacity-50"
        >
          <div className="text-[11px] font-medium uppercase tracking-wider text-text-4">
            {title}
          </div>
          {caption && (
            <div className="text-[11px] text-text-4">{caption}</div>
          )}
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button
            onClick={() => setOpen(!open)}
            className="text-[11px] text-text-3 active:opacity-50"
          >
            {open ? "Tutup" : "Buka"}
          </button>
        </div>
      </div>
      {open && children}
    </section>
  );
}

export function ListBox({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border-y border-border py-4 text-center text-[12px] text-text-4">
      {children}
    </div>
  );
}

export function AccentBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg active:opacity-80 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] text-text-3 active:opacity-50"
    >
      {children}
    </button>
  );
}
