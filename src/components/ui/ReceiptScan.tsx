"use client";

import { useRef, useState } from "react";
import { hapticSuccess, hapticWarn } from "@/lib/haptic";

/**
 * "📷 Scan struk" — take or pick a receipt photo, read it on the device and
 * hand back the total + shop name. Nothing is uploaded anywhere.
 */
export function ReceiptScanButton({
  onResult,
}: {
  onResult: (r: { amount: number | null; merchant: string | null }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [pct, setPct] = useState(0);

  async function onFile(file: File) {
    setState("busy");
    setPct(0);
    try {
      const { scanReceipt } = await import("@/lib/receipt");
      const r = await scanReceipt(file, setPct);
      if (r.amount == null) throw new Error("no-total");
      onResult({ amount: r.amount, merchant: r.merchant });
      setState("done");
      hapticSuccess();
    } catch {
      setState("fail");
      hapticWarn();
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={state === "busy"}
        onClick={() => input.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-bg-card py-3 text-[14px] font-semibold text-text-2 active:scale-[0.99] disabled:opacity-70"
      >
        {state === "busy" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Membaca struk… {pct > 0 ? `${pct}%` : ""}
          </>
        ) : (
          <>📷 Scan struk</>
        )}
      </button>
      {state === "done" && (
        <p className="mt-1.5 text-center text-[12px] text-[color:var(--positive)]">
          Terbaca! Cek lagi nominalnya ya.
        </p>
      )}
      {state === "fail" && (
        <p className="mt-1.5 text-center text-[12px] text-[color:var(--negative)]">
          Totalnya belum terbaca. Coba foto lebih dekat & terang, atau isi manual.
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
