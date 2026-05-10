"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Splash + path resolver.
 *
 * Two responsibilities:
 *
 * 1. Initial entry from `/` → decide whether to send the user to /auth or
 *    /home based on the cached session pointer in localStorage.
 *
 * 2. Hard-refresh on a deep route (e.g. user reloads on /goals): the static
 *    host backing this deployment falls back to /index.html for any path
 *    that doesn't have an exact file match, which means we get rendered
 *    while `window.location.pathname` is something else. We detect this
 *    case and route the user back to the path they actually wanted.
 *
 * We use the Next.js client router so navigation goes through JS chunks
 * (no extra HTTP fetch); a hard navigation would loop back to /index.html.
 */
export default function SplashPage() {
  const router = useRouter();
  const [target, setTarget] = useState<string>("/auth");

  useEffect(() => {
    const path =
      typeof window !== "undefined" ? window.location.pathname : "/";

    let next: string;
    if (path && path !== "/" && path !== "/index.html") {
      // Recover from a hard refresh on a deep route.
      next = path.replace(/\.html$/, "");
    } else {
      next = "/auth";
      try {
        const raw = localStorage.getItem("bareng:auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.userId) next = "/home";
        }
      } catch {
        // localStorage may throw in private mode — fall through to /auth.
      }
    }
    setTarget(next);

    // If we landed on the splash because the host's SPA fallback served
    // /index.html for a deep URL, the Next.js router thinks we're at "/" but
    // the URL bar says otherwise. router.replace(samePath) is a no-op in
    // that case — we have to do a hard navigation to the static .html shim
    // that Next.js generated for that route. That file is served by the
    // host directly (no fallback), so we land on the right page.
    const isHardRefreshRecovery =
      typeof window !== "undefined" &&
      window.location.pathname !== "/" &&
      window.location.pathname !== "/index.html";

    const fire = () => {
      if (isHardRefreshRecovery) {
        window.location.replace(next + ".html");
      } else {
        router.replace(next);
      }
    };
    const t1 = setTimeout(fire, 600);
    const t2 = setTimeout(fire, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [router]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-bg-app theme-transition">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[22px] bg-accent text-accent-fg">
          <svg
            viewBox="0 0 44 44"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-11 w-11"
            aria-label="Twogether logo"
          >
            <circle cx="17" cy="22" r="10" />
            <circle cx="27" cy="22" r="10" />
          </svg>
        </div>
        <div>
          <div className="text-[28px] font-bold tracking-tight text-text-1">
            Twogether
          </div>
          <div className="mt-1 text-sm text-text-3">Untuk kalian berdua</div>
        </div>
        <div className="mt-6 h-0.5 w-12 overflow-hidden rounded-full bg-bg-elev2">
          <div className="h-full w-full origin-left animate-[spfill_1s_ease_forwards] bg-accent" />
        </div>
        <FallbackTap target={target} />
      </div>
      <style jsx global>{`
        @keyframes spfill {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </main>
  );
}

function FallbackTap({ target }: { target: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => router.replace(target)}
      className="mt-4 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg"
    >
      Lanjutkan
    </button>
  );
}
