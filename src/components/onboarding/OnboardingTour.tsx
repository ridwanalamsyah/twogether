"use client";

import { useEffect, useState } from "react";

const KEY = "bareng:onboarded:v1";

const STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "👋",
    title: "Selamat datang di Twogether",
    body: "Untuk kalian berdua — keuangan, tracker, jadwal, dan momen di satu tempat. Offline-first, data tetap kamu yang punya.",
  },
  {
    emoji: "🧩",
    title: "Dashboard yang bisa kamu atur",
    body: "Tahan & geser tile di home untuk reorder. Aktif/nonaktifkan widget di Settings → Customize Dashboard.",
  },
  {
    emoji: "🤝",
    title: "Twogether = berdua (atau lebih)",
    body: "Tambahkan pasangan/teman di Settings → Workspace. Setiap transaksi ada label siapa yang bayar, plus opsi 'Bersama' untuk shared.",
  },
  {
    emoji: "🔐",
    title: "Privasi bukan tambahan",
    body: "Data di-encrypt, password di-hash, moments bisa kamu kunci end-to-end. Kapan pun bisa export atau hapus akun.",
  },
  {
    emoji: "🎯",
    title: "Mulai dari yang penting",
    body: "Kamu sudah punya beberapa contoh data. Hapus & ganti dengan punya kamu, atau mulai dari nol di Settings.",
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50">
      <div className="mx-auto w-full max-w-[480px] rounded-t-[24px] bg-bg-app p-6 pb-[calc(20px+var(--sab))] slide-up theme-transition">
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
