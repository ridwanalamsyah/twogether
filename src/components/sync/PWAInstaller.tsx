"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { isNative } from "@/lib/native";

const IOS_HINT_KEY = "twogether:ios-install-hint";
const HINT_AGAIN_MS = 14 * 86_400_000;

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  // Other iOS browsers can't add to the Home Screen the same way.
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone || isNative());

    // Ask the browser not to clear our IndexedDB under storage pressure.
    // Safari can drop site data after days without a visit unless the app
    // is on the Home Screen, so this plus the hint below protect it.
    void navigator.storage?.persist?.().catch(() => undefined);

    if (!isStandalone && !isNative() && isIosSafari()) {
      try {
        const last = Number(localStorage.getItem(IOS_HINT_KEY)) || 0;
        if (Date.now() - last > HINT_AGAIN_MS) setIosHint(true);
      } catch {
        setIosHint(true);
      }
    }

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
    // The native iOS app bundles its files; a service worker isn't needed
    // (and isn't supported on the capacitor:// scheme).
    if (isNative()) return;
    let reg: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => {
        reg = r;
      })
      .catch(() => undefined);
    // Installed PWAs can stay alive for days — look for a new deploy every
    // time the app comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === "visible") void reg?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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

  function dismissIosHint() {
    setIosHint(false);
    try {
      localStorage.setItem(IOS_HINT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  if (standalone) return null;

  if (iosHint) {
    return (
      <div className="pop-in fixed bottom-[calc(var(--nav-h)+12px)] left-3 right-3 z-40 mx-auto max-w-[456px] rounded-2xl border border-border bg-bg-elev2 p-3.5 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-card text-text-2">
            <Smartphone size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-text-1">Pasang ke Layar Utama</div>
            <div className="mt-0.5 text-[12px] leading-snug text-text-3">
              Tap <Share size={13} className="inline -mt-0.5" aria-label="Bagikan" /> di bawah Safari, lalu{" "}
              <b className="text-text-2">Tambah ke Layar Utama</b>. Data lebih aman dan notifikasi bisa jalan.
            </div>
          </div>
          <button onClick={dismissIosHint} aria-label="Tutup" className="-mr-1 -mt-1 p-1 text-text-4">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-[calc(var(--nav-h)+12px)] left-3 right-3 z-40 mx-auto flex max-w-[456px] items-center gap-2 rounded-lg border border-border bg-bg-elev2 px-3 py-2 shadow-lg">
      <Smartphone size={18} className="shrink-0 text-text-2" />
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
