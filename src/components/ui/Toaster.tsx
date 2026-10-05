"use client";

import { useToast } from "@/lib/toast";

export function Toaster() {
  const { text, tone, hide } = useToast();
  if (!text) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h,64px)+var(--sab)+20px)] z-[95] flex justify-center px-4 md:bottom-8">
      <button
        onClick={hide}
        role="status"
        className={`pop-in pointer-events-auto max-w-[440px] rounded-2xl px-4 py-3 text-left text-[13px] font-semibold shadow-float ${
          tone === "danger"
            ? "bg-[color:var(--negative-bg)] text-[color:var(--negative)]"
            : tone === "warn"
              ? "bg-[color:var(--warning-bg)] text-[color:var(--warning)]"
              : "bg-bg-card text-text-1"
        }`}
      >
        {text}
      </button>
    </div>
  );
}
