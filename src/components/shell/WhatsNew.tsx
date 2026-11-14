"use client";

import { Check } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { WHATS_NEW, markWhatsNewSeen, whatsNewSeen } from "@/lib/whatsNew";
import { PushCard } from "@/components/settings/PushCard";
import { pushState } from "@/lib/push";

/** The list itself; also used from Pengaturan -> Yang baru. */
export function WhatsNewSheet({ onClose }: { onClose: () => void }) {
  // Offer notifications right here when the server is ready but this phone
  // hasn't switched them on yet.
  const [askPush, setAskPush] = useState(false);
  useEffect(() => {
    void pushState().then((s) => setAskPush(s === "off"));
  }, []);
  return (
    <Sheet
      title="Yang baru"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="btn-accent w-full">
          Oke, mengerti
        </button>
      }
    >
      <ul className="space-y-3 pb-2">
        {WHATS_NEW.items.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[14px] leading-snug text-text-1">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Check size={12} strokeWidth={2.6} aria-hidden />
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {askPush && (
        <div className="mt-4">
          <PushCard />
        </div>
      )}
    </Sheet>
  );
}

/** Pops up once on Beranda after an update (never during the first-run tour). */
export function WhatsNew() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (pathname !== "/home" || whatsNewSeen()) return;
    let onboarded = false;
    try {
      onboarded = !!localStorage.getItem("bareng:onboarded:v1");
    } catch {
      /* private mode */
    }
    if (!onboarded) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname]);
  return (
    <AnimatePresence>
      {open && (
        <WhatsNewSheet
          key="whats-new"
          onClose={() => {
            markWhatsNewSeen();
            setOpen(false);
          }}
        />
      )}
    </AnimatePresence>
  );
}
