"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { WHATS_NEW, markWhatsNewSeen, whatsNewSeen } from "@/lib/whatsNew";
import { PushCard } from "@/components/settings/PushCard";
import { pushState } from "@/lib/push";

/** The list itself; also used from Pengaturan → Yang baru. */
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
        <button onClick={onClose} className="btn-accent w-full">
          Oke, mengerti
        </button>
      }
    >
      <ul className="space-y-3 pb-2">
        {WHATS_NEW.items.map((t) => (
          <li key={t} className="flex gap-3 text-[14px] leading-snug text-text-1">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
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
  if (!open) return null;
  return (
    <WhatsNewSheet
      onClose={() => {
        markWhatsNewSeen();
        setOpen(false);
      }}
    />
  );
}
