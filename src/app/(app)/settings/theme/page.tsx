"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { ACCENT_OPTIONS, useTheme } from "@/stores/theme";

const MODES: { id: "light" | "dark" | "system"; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Auto" },
];

export default function ThemePage() {
  const mode = useTheme((s) => s.mode);
  const accent = useTheme((s) => s.accent);
  const setMode = useTheme((s) => s.setMode);
  const setAccent = useTheme((s) => s.setAccent);

  return (
    <div className="animate-in">
      <AppHeader
        title="Tema"
        actions={
          <Link
            href="/settings"
            className="text-[12px] text-text-3 active:opacity-50"
          >
            Selesai
          </Link>
        }
      />

      <div className="px-5 pt-4 pb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
          Mode
        </div>
        <div className="flex gap-4 border-b border-border text-xs">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`-mb-px border-b pb-2 font-medium transition-colors ${
                mode === m.id
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-4"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-6 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
          Aksen
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              className={`flex items-center gap-2 rounded-md border p-2 text-[12px] transition-colors ${
                accent === a.id
                  ? "border-text-1 text-text-1"
                  : "border-border text-text-3"
              }`}
            >
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                style={{ background: a.swatch }}
              />
              {a.label}
            </button>
          ))}
        </div>

        <div className="mt-6 mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
          Preview
        </div>
        <div className="space-y-2">
          <button className="btn-accent w-full text-sm">Tombol Aksen</button>
          <button className="btn-soft w-full text-sm">Tombol Soft</button>
        </div>
      </div>
    </div>
  );
}
