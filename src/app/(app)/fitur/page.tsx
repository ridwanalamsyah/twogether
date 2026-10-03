"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { FEATURES } from "@/data/features";
import { useFeatures } from "@/stores/features";
import { hapticTap } from "@/lib/haptic";

export default function JelajahPage() {
  const enabled = useFeatures((s) => s.enabled);
  const toggle = useFeatures((s) => s.toggle);
  const [editing, setEditing] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const mine = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f));
  const others = FEATURES.filter((f) => !enabled.includes(f.href));

  return (
    <div>
      <AppHeader
        title="Jelajah"
        actions={
          mine.length > 0 ? (
            <button
              onClick={() => setEditing((v) => !v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                editing ? "bg-accent text-accent-fg" : "text-text-2"
              }`}
            >
              {editing ? "Selesai" : "Atur"}
            </button>
          ) : null
        }
      />

      <div className="px-5 pt-4 pb-8">
        {mine.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-3">
            Belum ada ruang. Tambahkan yang kalian butuhkan di bawah.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5">
            {mine.map((f) => (
              <li key={f.href} className="relative slide-up">
                <Link
                  href={f.href}
                  onClick={(e) => editing && e.preventDefault()}
                  className={`pressable flex h-full flex-col gap-2 rounded-2xl border border-border bg-bg-elev1 p-4 ${
                    editing ? "animate-[wiggle_0.3s_ease-in-out_infinite_alternate]" : ""
                  }`}
                >
                  <span className="text-[28px] leading-none">{f.emoji}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-text-1">
                      {f.title}
                    </span>
                    <span className="block text-[12px] leading-snug text-text-3">
                      {f.subtitle}
                    </span>
                  </span>
                </Link>
                {editing && (
                  <button
                    aria-label={`Sembunyikan ${f.title}`}
                    onClick={() => {
                      hapticTap();
                      toggle(f.href);
                    }}
                    className="pop-in absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-text-1 text-[14px] font-bold leading-none text-bg-app shadow"
                  >
                    −
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {others.length > 0 && (
          <section className="mt-8">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full items-center justify-between py-2 text-left active:opacity-60"
            >
              <span>
                <span className="block text-[14px] font-semibold text-text-1">
                  Tambah ruang
                </span>
                <span className="block text-[12px] text-text-3">
                  {others.length} ruang lain siap dipakai kapan saja
                </span>
              </span>
              <span
                className={`text-text-3 transition-transform duration-300 ease-ios ${
                  showMore ? "rotate-90" : ""
                }`}
              >
                ›
              </span>
            </button>
            {showMore && (
              <ul className="slide-up mt-2 divide-y divide-border border-y border-border">
                {others.map((f) => (
                  <li key={f.href} className="flex items-center gap-3 py-2.5">
                    <span className="text-[20px] leading-none">{f.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] text-text-1">{f.title}</span>
                      <span className="block truncate text-[12px] text-text-4">
                        {f.subtitle}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        hapticTap();
                        toggle(f.href);
                      }}
                      className="rounded-full bg-bg-elev2 px-3 py-1 text-[12px] font-semibold text-text-1 active:scale-95"
                    >
                      + Tambah
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
