"use client";

import { useEffect, useState } from "react";

const KEY = "bareng:onboarded:v1";

const STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "👋",
    title: "Selamat datang di Twogether",
    body: "Untuk kalian berdua — uang, jadwal, kebiasaan, dan kenangan di satu tempat. Tetap jalan walau tanpa internet.",
  },
  {
    emoji: "🧩",
    title: "Beranda yang bisa kamu atur",
    body: "Tap \"Susun\" di Beranda untuk menggeser urutan kartu. Tombol ＋ di tengah bawah untuk catat apa saja dalam 2 detik.",
  },
  {
    emoji: "🤝",
    title: "Twogether = berdua (atau lebih)",
    body: "Undang pasangan lewat ⚙️ → Pasangan. Tiap transaksi tercatat siapa yang bayar, ada juga pilihan 'Bersama'.",
  },
  {
    emoji: "🔐",
    title: "Privasi bukan tambahan",
    body: "Catatan kalian cuma untuk kalian. Moment bisa dikunci, dan kapan pun kamu bisa unduh atau hapus semuanya.",
  },
  {
    emoji: "🎯",
    title: "Mulai dari yang penting",
    body: "Kamu sudah punya beberapa contoh data. Hapus & ganti dengan punya kamu. Fitur lainnya ada di tab Jelajah.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  function close() {
    if (typeof window !== "undefined") localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step >= STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-in">
      <div className="mx-auto w-full max-w-[480px] rounded-t-[24px] bg-bg-app p-6 pb-[calc(20px+var(--sab))] sheet-up theme-transition">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-4 flex justify-center text-5xl">{s.emoji}</div>
        <div className="text-center text-lg font-bold">{s.title}</div>
        <p className="mx-auto mt-2 max-w-[320px] text-center text-sm leading-relaxed text-text-2">
          {s.body}
        </p>
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "w-1.5 bg-bg-elev3"
              }`}
            />
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={close}
            className="flex-1 rounded-full bg-bg-elev2 py-2.5 text-sm font-semibold text-text-2"
          >
            Lewati
          </button>
          <button
            onClick={() => (last ? close() : setStep(step + 1))}
            className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-fg"
          >
            {last ? "Mulai pakai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}
