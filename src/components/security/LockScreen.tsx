"use client";

import { useEffect, useState } from "react";
import { useSecurity } from "@/stores/security";
import { verifyBiometric } from "@/lib/biometric";
import { hapticSuccess, hapticWarn } from "@/lib/haptic";

/**
 * PIN pad overlay. Used for the whole-app lock and for locked spaces
 * (Siklus, Uang, …). Offers Face ID / sidik jari when it was set up.
 */
export function LockScreen({
  title = "Masukkan PIN",
  subtitle = "Twogether terkunci.",
  emoji = "🔒",
  onCancel,
}: {
  title?: string;
  subtitle?: string;
  emoji?: string;
  /** Show a "Kembali" button (space locks only). */
  onCancel?: () => void;
}) {
  const unlock = useSecurity((s) => s.unlock);
  const bioCredId = useSecurity((s) => s.bioCredId);
  const unlockWithBiometric = useSecurity((s) => s.unlockWithBiometric);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function tryBio() {
    if (!bioCredId) return;
    if (await verifyBiometric(bioCredId)) {
      hapticSuccess();
      unlockWithBiometric();
    }
  }

  // Offer biometrics straight away when available.
  useEffect(() => {
    if (bioCredId) void tryBio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(value: string) {
    const ok = await unlock(value);
    if (ok) {
      hapticSuccess();
      return;
    }
    if (value.length >= 8 || value.length >= 4) {
      setError("PIN salah");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setPin("");
      hapticWarn();
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

  const key =
    "grid h-[68px] w-[68px] place-items-center rounded-full bg-bg-card text-[24px] font-semibold text-text-1 shadow-card transition-transform active:scale-90";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-app px-6 pt-safe">
      <div
        className="pop-in mb-5 grid h-16 w-16 place-items-center rounded-[22px] text-[30px] text-accent-fg shadow-float"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
      >
        {emoji}
      </div>
      <div className="text-[20px] font-extrabold text-text-1">{title}</div>
      <div className="mb-6 mt-1 text-[13px] text-text-3">{subtitle}</div>
      <div className={`mb-4 flex gap-3 ${shake ? "animate-[wiggle_0.08s_ease-in-out_4_alternate]" : ""}`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-all ${i < pin.length ? "scale-110 bg-accent" : "bg-bg-elev3"}`}
          />
        ))}
      </div>
      <div className="mb-4 h-4 text-[13px] font-semibold text-[color:var(--negative)]">{error}</div>
      <div className="grid grid-cols-3 gap-4">
        {"123456789".split("").map((d) => (
          <button key={d} onClick={() => press(d)} className={key}>
            {d}
          </button>
        ))}
        {bioCredId ? (
          <button onClick={tryBio} className={`${key} text-[26px]`} aria-label="Pakai Face ID / sidik jari">
            👆
          </button>
        ) : (
          <div />
        )}
        <button onClick={() => press("0")} className={key}>
          0
        </button>
        <button onClick={() => press("del")} className="grid h-[68px] w-[68px] place-items-center rounded-full text-[22px] text-text-3 active:bg-bg-elev2" aria-label="Hapus">
          ⌫
        </button>
      </div>
      {onCancel && (
        <button onClick={onCancel} className="mt-8 text-[14px] font-semibold text-text-3">
          ‹ Kembali
        </button>
      )}
    </div>
  );
}
