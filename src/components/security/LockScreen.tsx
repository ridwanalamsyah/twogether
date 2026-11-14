"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Delete, LockKeyhole, ScanFace } from "lucide-react";
import { useSecurity } from "@/stores/security";
import { verifyBiometric } from "@/lib/biometric";
import { hapticSuccess, hapticWarn } from "@/lib/haptic";
import type { IconSpec } from "@/lib/icons";

/**
 * PIN pad overlay. Used for the whole-app lock and for locked spaces
 * (Siklus, Uang, ...). Offers Face ID / sidik jari when set up.
 */
export function LockScreen({
  title = "Masukkan PIN",
  subtitle = "Twogether terkunci.",
  icon,
  emoji,
  onCancel,
}: {
  title?: string;
  subtitle?: string;
  icon?: IconSpec;
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        press(e.key);
      } else if (e.key === "Backspace") {
        press("del");
      } else if (e.key === "Escape" && onCancel) {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel]);

  const BadgeIcon = icon?.Icon ?? LockKeyhole;
  const key =
    "grid h-[68px] w-[68px] place-items-center rounded-full bg-bg-card tabular-nums text-[24px] font-semibold text-text-1 shadow-card transition-transform duration-150 active:scale-90";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-app px-6 pt-safe"
    >
      <div className="pop-in mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-accent text-accent-fg shadow-float">
        {icon ? (
          <BadgeIcon size={28} strokeWidth={2} aria-hidden />
        ) : emoji ? (
          <span className="text-[28px]" aria-hidden>{emoji}</span>
        ) : (
          <LockKeyhole size={28} strokeWidth={2} aria-hidden />
        )}
      </div>
      <div className="text-[20px] font-bold tracking-tight text-text-1">{title}</div>
      <div className="mb-6 mt-1 text-[13px] text-text-3">{subtitle}</div>
      <div className={`mb-4 flex gap-3 ${shake ? "animate-[wiggle_0.08s_ease-in-out_4_alternate]" : ""}`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-transform duration-150 ${i < pin.length ? "scale-110 bg-accent" : "bg-bg-elev3"}`}
          />
        ))}
      </div>
      <div className="mb-4 h-4 text-[13px] font-semibold text-[color:var(--negative)]" role="alert">
        {error}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {"123456789".split("").map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className={key}>
            {d}
          </button>
        ))}
        {bioCredId ? (
          <button
            type="button"
            onClick={tryBio}
            className={key}
            aria-label="Pakai Face ID / sidik jari"
          >
            <ScanFace size={24} strokeWidth={1.9} />
          </button>
        ) : (
          <div />
        )}
        <button type="button" onClick={() => press("0")} className={key}>
          0
        </button>
        <button
          type="button"
          onClick={() => press("del")}
          className="grid h-[68px] w-[68px] place-items-center rounded-full text-text-3 transition-transform duration-150 active:scale-90 active:bg-bg-elev2"
          aria-label="Hapus"
        >
          <Delete size={22} strokeWidth={2} />
        </button>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-8 inline-flex min-h-[44px] items-center gap-1 rounded-full px-4 py-2 text-[14px] font-semibold text-text-3 transition-transform active:scale-95"
        >
          <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          Kembali
        </button>
      )}
    </div>
  );
}
