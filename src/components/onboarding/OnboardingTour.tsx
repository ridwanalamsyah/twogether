"use client";

import { Check, HeartHandshake, Send, Smile } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { useFeatures } from "@/stores/features";
import { useDashboard } from "@/stores/dashboard";
import { BUNDLES, FEATURES, tintBg } from "@/data/features";
import { usePeople } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { IconTile, bundleIcon } from "@/lib/icons";

// Same key as the old tour, so people who already saw it aren't asked again.
const KEY = "bareng:onboarded:v1";
const STEPS = 4;

export function OnboardingTour() {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { setNick } = useNick();
  const enableMany = useFeatures((s) => s.enableMany);
  const revealFor = useDashboard((s) => s.revealFor);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [nick, setNickInput] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* storage blocked */
    }
  }, []);

  function finish(to?: string) {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    if (to) router.push(to);
  }

  async function next() {
    hapticTap();
    if (step === 1 && nick.trim()) await setNick(me, nick);
    if (step === 2 && picked.length) {
      const hrefs = Array.from(new Set(BUNDLES.filter((b) => picked.includes(b.id)).flatMap((b) => b.hrefs)));
      enableMany(hrefs);
      if (userId) void revealFor(userId, hrefs);
    }
    if (step === STEPS - 1) {
      hapticSuccess();
      finish();
      return;
    }
    // Already together: no need to show the invite step.
    if (step === 2 && partner) {
      hapticSuccess();
      finish();
      return;
    }
    setDir(1);
    setStep(step + 1);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-in md:items-center">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-bg-app p-6 pb-[calc(20px+var(--sab))] sheet-up theme-transition md:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: partner ? STEPS - 1 : STEPS }, (_, i) => (
              <motion.span
                key={i}
                className={`h-1.5 rounded-full ${i === step ? "bg-accent" : i < step ? "bg-text-4" : "bg-bg-elev3"}`}
                animate={{ width: i === step ? 24 : 6 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ))}
          </div>
          <button onClick={() => finish()} className="text-[13px] font-semibold text-text-3">
            Lewati
          </button>
        </div>

        {/* Small inset so selected cards' ring isn't clipped by the scroller. */}
        <div className="-mx-1.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-1.5 pt-0.5">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          {step === 0 && (
            <div className="text-center">
              <IconTile spec={{ Icon: HeartHandshake, tint: "#f43f5e" }} size={72} radius={22} className="float-heart-slow mx-auto" />
              <h2 className="mt-4 text-[24px] font-extrabold leading-tight text-text-1">Satu tempat untuk kalian berdua</h2>
              <p className="mx-auto mt-2 max-w-[320px] text-[14px] leading-relaxed text-text-3">
                Uang, ibadah, jadwal, dan kenangan — dicatat bareng, tersimpan di HP berdua. Tetap jalan walau tanpa internet.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[12px] font-semibold text-text-2">
                {[
                  ["💰", "Uang bareng"],
                  ["🕌", "Ibadah"],
                  ["💌", "Kenangan"],
                ].map(([e, l]) => (
                  <div key={l} className="rounded-2xl bg-bg-card py-3 shadow-card">
                    <div className="text-[22px]">{e}</div>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <IconTile spec={{ Icon: Smile, tint: "#f59e0b" }} size={56} radius={18} />
              <h2 className="mt-3 text-[22px] font-extrabold text-text-1">Mau dipanggil apa?</h2>
              <p className="mt-1 text-[14px] text-text-3">Dipakai di sapaan dan terlihat oleh pasanganmu. Bisa diganti kapan saja.</p>
              <input
                className="input-base mt-4 text-[17px]"
                value={nick}
                onChange={(e) => setNickInput(e.target.value)}
                placeholder={`mis. ${me.split(" ")[0]}, Mas, Adek`}
                maxLength={20}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-[22px] font-extrabold text-text-1">Kalian mau pakai untuk apa?</h2>
              <p className="mt-1 text-[14px] text-text-3">Pilih satu atau lebih. Sisanya tetap ada di Jelajah.</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {BUNDLES.map((b, i) => {
                  const on = picked.includes(b.id);
                  const titles = b.hrefs.map((h) => FEATURES.find((f) => f.href === h)?.title).filter(Boolean);
                  return (
                    <motion.button
                      key={b.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0, scale: on ? 1 : 0.985 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 28,
                        opacity: { duration: 0.25, delay: 0.05 + i * 0.045 },
                        y: { type: "spring", stiffness: 380, damping: 30, delay: 0.05 + i * 0.045 },
                      }}
                      onClick={() => {
                        hapticTap();
                        setPicked(on ? picked.filter((x) => x !== b.id) : [...picked, b.id]);
                      }}
                      aria-pressed={on}
                      className={`relative rounded-[20px] p-3.5 text-left transition-[background-color,box-shadow] duration-200 ${on ? "ring-2 ring-accent" : ""}`}
                      style={{ background: tintBg(b.tint, on ? 22 : 12) }}
                    >
                      <AnimatePresence>
                        {on && (
                          <motion.span
                            className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-fg"
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 600, damping: 22 }}
                          >
                            <Check size={12} strokeWidth={3.2} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <IconTile spec={bundleIcon(b.id)} size={38} radius={12} />
                      <div className="mt-2 text-[14px] font-bold text-text-1">{b.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-text-3">{titles.join(", ")}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <IconTile spec={{ Icon: Send, tint: "#3b82f6" }} size={72} radius={22} className="mx-auto" />
              <h2 className="mt-4 text-[22px] font-extrabold text-text-1">Ajak pasanganmu</h2>
              <p className="mx-auto mt-2 max-w-[320px] text-[14px] leading-relaxed text-text-3">
                Kirim undangan supaya catatan kalian tersambung — yang satu mencatat, yang lain langsung lihat.
              </p>
              <button onClick={() => finish("/settings/workspace")} className="btn-accent mt-6 w-full">
                Kirim undangan
              </button>
            </div>
          )}
          </motion.div>
          </AnimatePresence>
        </div>

        {step < 3 ? (
          <button onClick={next} className="btn-accent mt-5 w-full">
            {step === 0 ? "Mulai" : step === 2 && !picked.length ? "Nanti saja" : "Lanjut"}
          </button>
        ) : (
          <button onClick={() => finish()} className="mt-3 w-full py-2 text-[14px] font-semibold text-text-3">
            Nanti saja
          </button>
        )}
      </div>
    </div>
  );
}
