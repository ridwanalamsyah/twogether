"use client";

import { useEffect, useState } from "react";

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  async function install() {
    const prompt = deferredPrompt as Event & {
      prompt?: () => Promise<void>;
      userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    await prompt.prompt?.();
    await prompt.userChoice?.catch(() => undefined);
    setDeferredPrompt(null);
  }

  if (standalone || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-[calc(var(--nav-h)+12px)] left-3 right-3 z-40 mx-auto flex max-w-[456px] items-center gap-2 rounded-lg border border-border bg-bg-elev2 px-3 py-2 shadow-lg">
      <span className="text-base">📱</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-text-1">
          Install Twogether
        </div>
        <div className="truncate text-[10px] text-text-3">
          Buka seperti app native dari Home Screen.
        </div>
      </div>
      <button
        onClick={install}
        className="rounded-md bg-text-1 px-3 py-1.5 text-[11px] font-semibold text-bg-app active:scale-95"
      >
        Install
      </button>
    </div>
  );
}
