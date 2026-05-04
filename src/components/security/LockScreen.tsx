"use client";

import { useEffect, useState } from "react";
import { useSecurity } from "@/stores/security";

/**
 * Full-screen overlay that blocks the app until the correct PIN is entered.
 * Only rendered by AppLayout when `useSecurity.locked && pinHash`.
 */
export function LockScreen() {
  const unlock = useSecurity((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPin("");
    setError(null);
  }, []);

  async function submit(value: string) {
    const ok = await unlock(value);
    if (!ok) {
      setError("PIN salah");
      setPin("");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(120);
      }
    }
  }

  function press(d: string) {
    if (d === "del") {
      setPin((p) => p.slice(0, -1));
      setError(null);
      return;
    }
    setError(null);
    setPin((p) => {
      const next = (p + d).slice(0, 8);
      if (next.length >= 4) void submit(next);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-app px-6 pt-safe theme-transition">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl text-accent-fg">
        🔒
      </div>
      <div className="text-lg font-bold">Masukkan PIN</div>
      <div className="mt-1 mb-6 text-xs text-text-3">
        App kamu terkunci. Masukkan 4–8 digit PIN.
      </div>
      <div className="mb-6 flex gap-2">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full transition-colors ${
              i < pin.length ? "bg-accent" : "bg-bg-elev3"
            }`}
          />
        ))}
      </div>
      {error && (
        <div className="mb-3 text-xs font-semibold text-[color:var(--negative)]">
          {error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {"123456789".split("").map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-elev2 text-xl font-semibold active:bg-bg-elev3"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press("0")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-elev2 text-xl font-semibold active:bg-bg-elev3"
        >
          0
        </button>
        <button
          onClick={() => press("del")}
          className="flex h-14 w-14 items-center justify-center rounded-full text-text-3 active:bg-bg-elev2"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
