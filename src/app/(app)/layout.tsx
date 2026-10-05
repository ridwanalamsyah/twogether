"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { QuickCapture } from "@/components/shell/QuickCapture";
import { useUi } from "@/stores/ui";
import { useAuth } from "@/stores/auth";
import { useSecurity } from "@/stores/security";
import { LockScreen } from "@/components/security/LockScreen";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { PWAUpdateBanner } from "@/components/shell/PWAUpdateBanner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const ready = useAuth((s) => s.ready);
  const bootstrap = useAuth((s) => s.bootstrap);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // We reached a real app route — clear the splash's recovery marker.
    try {
      sessionStorage.removeItem("twogether:recover");
    } catch {
      /* private mode */
    }
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      setHydrated(true);
      void bootstrap();
    };
    if (useAuth.persist.hasHydrated()) {
      finish();
    } else {
      const unsub = useAuth.persist.onFinishHydration(finish);
      const safety = setTimeout(finish, 400);
      return () => {
        cancelled = true;
        unsub();
        clearTimeout(safety);
      };
    }
  }, [bootstrap]);

  useEffect(() => {
    if (hydrated && ready && !userId) router.replace("/auth");
  }, [hydrated, ready, userId, router]);

  if (!hydrated || !ready) {
    return <BootScreen />;
  }
  if (!userId) return null;

  return (
    <div className="app-shell relative mx-auto flex max-w-[480px] flex-col bg-bg-app md:max-w-none md:pl-[var(--sidebar-w)]">
      <Sidebar />
      <OfflineBanner />
      <main className="flex-1 pb-nav">
        <div className="md:mx-auto md:max-w-[1080px]">{children}</div>
      </main>
      <BottomNav />
      <CaptureHost />
      <PWAUpdateBanner />
      <LockGate />
      <OnboardingTour />
    </div>
  );
}

/** One quick-capture sheet for the whole app; "N" opens it on a keyboard. */
function CaptureHost() {
  const open = useUi((s) => s.captureOpen);
  const openCapture = useUi((s) => s.openCapture);
  const close = useUi((s) => s.closeCapture);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      openCapture();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCapture]);
  return <QuickCapture open={open} onClose={close} />;
}

function LockGate() {
  const pinHash = useSecurity((s) => s.pinHash);
  const locked = useSecurity((s) => s.locked);
  if (!pinHash || !locked) return null;
  return <LockScreen />;
}

/** Calm loading state that matches the splash, instead of bare text. */
function BootScreen() {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-bg-app">
      <div className="flex flex-col items-center gap-4 animate-in">
        <div className="boot-pulse flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-accent-fg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <svg
            viewBox="0 0 44 44"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            className="h-8 w-8"
            aria-hidden
          >
            <circle cx="17" cy="22" r="10" />
            <circle cx="27" cy="22" r="10" />
          </svg>
        </div>
        <span className="text-[12px] text-text-4">Menyiapkan ruang kalian…</span>
      </div>
    </main>
  );
}
