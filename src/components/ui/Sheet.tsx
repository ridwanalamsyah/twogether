"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Bottom sheet on phones, centred dialog on iPad/laptop (see .sheet-up in
 * globals.css). Rendered in a portal so no parent transform can trap it.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-in"
      onClick={onClose}
    >
      <div
        className="sheet-up mx-auto flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-[26px] bg-bg-app shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold tracking-tight text-text-1">{title}</h2>
            <button onClick={onClose} className="text-[13px] font-medium text-text-3">
              Tutup
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-border px-5 pb-[calc(16px+var(--sab))] pt-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Small labelled field wrapper used inside sheets. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[12px] font-semibold text-text-3">{label}</span>
      {children}
    </label>
  );
}

/** Pill-style single choice. */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
            value === o.value ? "bg-accent text-accent-fg" : "bg-bg-card text-text-2 shadow-card"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
