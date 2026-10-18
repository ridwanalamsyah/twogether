"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";

/**
 * Drag a bottom sheet down by its top bar to close it. Pulling up gives a
 * little rubber band; a short flick is enough to dismiss. Spread
 * `panel` on the sheet (a motion.div), `handle` on its top bar and
 * `backdrop` on the dimmed layer so it fades as the sheet goes down.
 */
export function useSheetDrag(onClose: () => void) {
  const controls = useDragControls();
  const y = useMotionValue(0);
  const fade = useTransform(y, [0, 320], [1, 0.2]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 650) {
      animate(y, window.innerHeight, { duration: 0.22, ease: [0.4, 0, 1, 1] }).then(() => {
        onClose();
        // Sheets that stay mounted (QuickCapture) must open in place next time.
        y.set(0);
      });
    } else {
      animate(y, 0, { type: "spring", stiffness: 480, damping: 36 });
    }
  }

  return {
    panel: {
      drag: "y" as const,
      dragControls: controls,
      dragListener: false,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0.06, bottom: 1 },
      dragMomentum: false,
      onDragEnd,
      style: { y },
    },
    handle: {
      onPointerDown: (e: React.PointerEvent) => controls.start(e),
      style: { touchAction: "none" } as React.CSSProperties,
    },
    backdrop: { style: { opacity: fade } },
  };
}

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
  const drag = useSheetDrag(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <motion.div aria-hidden className="absolute inset-0 bg-black/40 backdrop-in" {...drag.backdrop} />
      <motion.div
        role="dialog"
        aria-label={title}
        className="sheet-up relative mx-auto flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-[26px] bg-bg-app shadow-float"
        onClick={(e) => e.stopPropagation()}
        {...drag.panel}
      >
        <div className="cursor-grab px-5 pt-3 active:cursor-grabbing" {...drag.handle}>
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
      </motion.div>
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

/** Like Field, for a group of buttons (a <label> would hijack their taps). */
export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="mb-3">
      <span className="mb-1.5 block text-[12px] font-semibold text-text-3">{label}</span>
      {children}
    </div>
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
