"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/shell/BottomNav";
import { useAuth } from "@/stores/auth";
import { useSecurity } from "@/stores/security";
import { LockScreen } from "@/components/security/LockScreen";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { QuickAddFab } from "@/components/shell/QuickAddFab";
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
      const safety = setTimeout(finish, 800);
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
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-bg-app text-sm text-text-3">
        Memuat workspace…
      </main>
    );
  }
  if (!userId) return null;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-bg-app">
      <OfflineBanner />
      <main className="flex-1 pb-nav">{children}</main>
      <BottomNav />
      <QuickAddFab />
      <PWAUpdateBanner />
      <LockGate />
      <OnboardingTour />
    </div>
  );
}

function LockGate() {
  const pinHash = useSecurity((s) => s.pinHash);
  const locked = useSecurity((s) => s.locked);
  if (!pinHash || !locked) return null;
  return <LockScreen />;
}
