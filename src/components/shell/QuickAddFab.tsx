"use client";

import { useState } from "react";
import { QuickCapture } from "@/components/shell/QuickCapture";
import { hapticTap } from "@/lib/haptic";

export function QuickAddFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Quick add"
        onClick={() => {
          hapticTap();
          setOpen(true);
        }}
        className="fixed bottom-[calc(var(--nav-h)+16px)] right-4 z-30 grid h-12 w-12 place-items-center rounded-full border border-text-1 bg-bg-app text-[24px] leading-none text-text-1 shadow-md active:scale-95"
      >
        +
      </button>

      <QuickCapture open={open} onClose={() => setOpen(false)} />
    </>
  );
}
