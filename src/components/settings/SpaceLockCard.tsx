"use client";

import { useEffect, useState } from "react";
import { useSecurity } from "@/stores/security";
import { useAuth } from "@/stores/auth";
import { FEATURES } from "@/data/features";
import { biometricAvailable, registerBiometric } from "@/lib/biometric";
import { hapticTap } from "@/lib/haptic";

const LOCKABLE = [
  { href: "/tracker", emoji: "💳", title: "Uang" },
  { href: "/kita", emoji: "💞", title: "Kita" },
  ...FEATURES.filter((f) =>
    ["/siklus", "/catatan", "/moments", "/patungan", "/goals", "/nikah", "/uang"].includes(f.href),
  ).map((f) => ({ href: f.href, emoji: f.emoji, title: f.title })),
];

export function SpaceLockCard() {
  const pinHash = useSecurity((s) => s.pinHash);
  const lockedSpaces = useSecurity((s) => s.lockedSpaces);
  const toggle = useSecurity((s) => s.toggleSpaceLock);
  const bioCredId = useSecurity((s) => s.bioCredId);
  const setBio = useSecurity((s) => s.setBioCredId);
  const name = useAuth((s) => s.name);
  const [bioOk, setBioOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void biometricAvailable().then(setBioOk);
  }, []);

  async function toggleBio(on: boolean) {
    setErr(null);
    if (!on) return setBio(null);
    try {
      setBio(await registerBiometric(name ?? ""));
    } catch {
      setErr("Face ID / sidik jari belum bisa dipakai di perangkat ini.");
    }
  }

  return (
    <section className="surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-[20px]">🔐</span>
        <div>
          <div className="text-[15px] font-bold text-text-1">Kunci per ruang</div>
          <div className="text-[12px] leading-snug text-text-3">
            Ruang yang dikunci minta PIN tiap dibuka lagi — cocok kalau HP sering dipinjam.
          </div>
        </div>
      </div>
      {!pinHash ? (
        <p className="mt-3 rounded-xl bg-bg-elev1 px-3 py-2.5 text-[13px] text-text-2">
          Buat PIN dulu di bagian <b>Kunci dengan PIN</b> di bawah.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {LOCKABLE.map((s) => {
              const on = lockedSpaces.includes(s.href);
              return (
                <button
                  key={s.href}
                  onClick={() => {
                    toggle(s.href);
                    hapticTap();
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                    on ? "bg-accent text-accent-fg" : "bg-bg-elev1 text-text-2"
                  }`}
                >
                  <span className="text-[16px]">{s.emoji}</span>
                  <span className="flex-1 truncate">{s.title}</span>
                  <span>{on ? "🔒" : ""}</span>
                </button>
              );
            })}
          </div>
          {bioOk && (
            <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg-elev1 px-3 py-2.5">
              <span>
                <span className="block text-[14px] font-semibold text-text-1">Buka pakai Face ID / sidik jari</span>
                <span className="block text-[12px] text-text-3">PIN tetap bisa dipakai</span>
              </span>
              <input
                type="checkbox"
                checked={!!bioCredId}
                onChange={(e) => void toggleBio(e.target.checked)}
                className="h-5 w-5 accent-[color:var(--accent)]"
              />
            </label>
          )}
          {err && <p className="mt-2 text-[12px] text-[color:var(--negative)]">{err}</p>}
        </>
      )}
    </section>
  );
}
