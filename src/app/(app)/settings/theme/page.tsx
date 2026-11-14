"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Moon, Smartphone, Sun } from "lucide-react";
import { AppHeader } from "@/components/shell/AppHeader";
import {
  ACCENT_OPTIONS,
  APP_ICONS,
  SEASONAL_OPTIONS,
  useTheme,
  type AccentOption,
} from "@/stores/theme";
import { hapticTap } from "@/lib/haptic";

const MODES: { id: "light" | "dark" | "system"; label: string; Icon: LucideIcon }[] = [
  { id: "light", label: "Terang", Icon: Sun },
  { id: "dark", label: "Gelap", Icon: Moon },
  { id: "system", label: "Ikut HP", Icon: Smartphone },
];

export default function ThemePage() {
  const mode = useTheme((s) => s.mode);
  const accent = useTheme((s) => s.accent);
  const icon = useTheme((s) => s.icon);
  const setMode = useTheme((s) => s.setMode);
  const setAccent = useTheme((s) => s.setAccent);
  const setIcon = useTheme((s) => s.setIcon);

  const pick = (o: AccentOption) => {
    setAccent(o.id);
    hapticTap();
  };

  return (
    <div>
      <AppHeader
        title="Tema & warna"
      />

      <div className="space-y-7 px-5 pb-10 pt-4">
        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Tampilan</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-[18px] py-3 text-[13px] font-semibold transition-transform active:scale-95 ${
                  mode === m.id ? "bg-accent text-accent-fg shadow-card" : "bg-bg-card text-text-2 shadow-card"
                }`}
              >
                <m.Icon size={20} strokeWidth={2} aria-hidden />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Tema musiman</h2>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {SEASONAL_OPTIONS.map((o) => {
              const selected = accent === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pick(o)}
                  className={`surface pressable flex min-h-[44px] items-center gap-3 p-3.5 text-left ${
                    selected ? "ring-2 ring-[color:var(--accent)] ring-offset-2 ring-offset-[color:var(--bg-app)]" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-10 w-10 shrink-0 rounded-full shadow-card"
                    style={{ background: `linear-gradient(135deg, ${o.swatch}, ${o.swatch2})` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-text-1">{o.label}</span>
                    <span className="block truncate text-[12px] text-text-3">{o.seasonal?.note}</span>
                  </span>
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[color:var(--accent)]"
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Warna polos</h2>
          <div className="flex flex-wrap gap-3">
            {ACCENT_OPTIONS.map((o) => (
              <button key={o.id} type="button" aria-pressed={accent === o.id} onClick={() => pick(o)} className="flex min-h-[44px] min-w-[44px] flex-col items-center gap-1.5">
                <span
                  className={`h-12 w-12 rounded-full shadow-card transition-transform ${
                    accent === o.id ? "scale-110 ring-4 ring-offset-2 ring-offset-[color:var(--bg-app)]" : ""
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${o.swatch}, ${o.swatch2})`,
                    ["--tw-ring-color" as string]: o.swatch,
                  }}
                />
                <span className={`text-[12px] ${accent === o.id ? "font-bold text-text-1" : "text-text-3"}`}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-[15px] font-extrabold text-text-1">Ikon app</h2>
          <p className="mb-3 text-[12px] text-text-3">
            Berlaku di tab browser. Untuk Layar Utama HP, hapus lalu tambahkan lagi setelah memilih.
          </p>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {APP_ICONS.map((i) => (
              <button
                key={i.id}
                type="button"
                aria-pressed={icon === i.id}
                onClick={() => {
                  setIcon(i.id);
                  hapticTap();
                }}
                className="flex min-h-[44px] flex-col items-center gap-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny local icon */}
                <img
                  src={i.id === "rose" ? "/icons/icon-192.png" : `/icons/alt/${i.id}-180.png`}
                  alt={i.label}
                  width={64}
                  height={64}
                  className={`h-16 w-16 rounded-[18px] shadow-card transition-transform ${
                    icon === i.id ? "scale-105 ring-4 ring-accent ring-offset-2 ring-offset-[color:var(--bg-app)]" : ""
                  }`}
                />
                <span className={`text-[12px] ${icon === i.id ? "font-bold text-text-1" : "text-text-3"}`}>{i.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Contoh</h2>
          <div className="surface space-y-2 p-4">
            <div aria-hidden="true" className="btn-accent pointer-events-none flex w-full items-center justify-center text-center">Tombol utama</div>
            <div aria-hidden="true" className="btn-soft pointer-events-none flex w-full items-center justify-center text-center">Tombol lembut</div>
          </div>
        </section>
      </div>
    </div>
  );
}
