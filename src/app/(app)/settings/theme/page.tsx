"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import {
  ACCENT_OPTIONS,
  APP_ICONS,
  SEASONAL_OPTIONS,
  useTheme,
  type AccentOption,
} from "@/stores/theme";
import { hapticTap } from "@/lib/haptic";

const MODES: { id: "light" | "dark" | "system"; label: string; emoji: string }[] = [
  { id: "light", label: "Terang", emoji: "☀️" },
  { id: "dark", label: "Gelap", emoji: "🌙" },
  { id: "system", label: "Ikut HP", emoji: "📱" },
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
        actions={
          <Link href="/settings" className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2">
            Selesai
          </Link>
        }
      />

      <div className="space-y-7 px-5 pb-10 pt-4">
        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Tampilan</h2>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-[18px] py-3 text-[13px] font-semibold transition-all ${
                  mode === m.id ? "bg-accent text-accent-fg shadow-[0_8px_18px_-10px_var(--accent)]" : "bg-bg-card text-text-2 shadow-card"
                }`}
              >
                <span className="block text-[20px]">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Tema musiman</h2>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {SEASONAL_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => pick(o)}
                className={`pressable relative overflow-hidden rounded-[20px] p-3.5 text-left text-white ${
                  accent === o.id ? "ring-4 ring-offset-2 ring-offset-[color:var(--bg-app)]" : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, ${o.swatch}, ${o.swatch2})`,
                  ["--tw-ring-color" as string]: o.swatch,
                }}
              >
                <span className="absolute -right-1 -top-2 text-[42px] opacity-30">{o.seasonal?.emoji}</span>
                <span className="block text-[15px] font-extrabold">{o.label}</span>
                <span className="block text-[12px] text-white/85">{o.seasonal?.note}</span>
                {accent === o.id && (
                  <span className="mt-2 inline-block rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold">
                    Dipakai ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-[15px] font-extrabold text-text-1">Warna polos</h2>
          <div className="flex flex-wrap gap-3">
            {ACCENT_OPTIONS.map((o) => (
              <button key={o.id} onClick={() => pick(o)} className="flex flex-col items-center gap-1.5">
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
            Berlaku di tab browser. Untuk Layar Utama HP, hapus lalu tambahkan lagi Twogether
            setelah memilih.
          </p>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {APP_ICONS.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  setIcon(i.id);
                  hapticTap();
                }}
                className="flex flex-col items-center gap-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny local icon */}
                <img
                  src={i.id === "rose" ? "/icons/icon-192.png" : `/icons/alt/${i.id}-180.png`}
                  alt={i.label}
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
            <button className="btn-accent w-full">Tombol utama</button>
            <button className="btn-soft w-full">Tombol lembut</button>
          </div>
        </section>
      </div>
    </div>
  );
}
