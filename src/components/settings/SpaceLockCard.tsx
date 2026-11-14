"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useSecurity } from "@/stores/security";
import { useAuth } from "@/stores/auth";
import { FEATURES } from "@/data/features";
import { IconTile, spaceIcon } from "@/lib/icons";
import { biometricAvailable, registerBiometric } from "@/lib/biometric";
import { hapticTap } from "@/lib/haptic";

const LOCKABLE = [
  { href: "/tracker", title: "Uang" },
  { href: "/kita", title: "Kita" },
  ...FEATURES.filter((f) =>
    ["/siklus", "/catatan", "/moments", "/patungan", "/goals", "/nikah", "/uang"].includes(f.href),
  ).map((f) => ({ href: f.href, title: f.title })),
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
        <IconTile spec={{ Icon: Lock, tint: "var(--accent)" }} size={40} radius={14} />
        <div>
          <div className="text-[15px] font-bold text-text-1">Kunci per ruang</div>
          <div className="text-[12px] leading-snug text-text-3">
            Ruang yang dikunci minta PIN tiap dibuka lagi, cocok saat HP sering dipinjam.
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
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    toggle(s.href);
                    hapticTap();
                  }}
                  className={`flex min-h-[44px] items-center gap-2 rounded-[14px] px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                    on ? "bg-text-1 text-bg-app" : "bg-bg-elev1 text-text-2"
                  }`}
                >
                  <IconTile spec={spaceIcon(s.href)} size={26} radius={8} />
                  <span className="flex-1 truncate">{s.title}</span>
                  {on && <Lock size={14} aria-hidden className="shrink-0" />}
                </button>
              );
            })}
          </div>
          {bioOk && (
            <label className="mt-3 flex min-h-[44px] items-center justify-between gap-3 rounded-xl bg-bg-elev1 px-3 py-2.5">
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
