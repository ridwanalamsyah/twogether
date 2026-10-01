"use client";

import { useEffect } from "react";
import { useTheme } from "@/stores/theme";
import { isInDarkHours, useSecurity } from "@/stores/security";

/**
 * Applies `data-theme` and `data-accent` to <html> based on the Zustand
 * theme store. Listens for system color-scheme changes when mode === "system".
 * Also honors the auto-dark schedule (overrides mode in the configured hours).
 */
let firstApply = true;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useTheme((s) => s.mode);
  const accent = useTheme((s) => s.accent);
  const autoDark = useSecurity((s) => s.autoDark);
  const darkFrom = useSecurity((s) => s.darkFrom);
  const darkTo = useSecurity((s) => s.darkTo);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      let resolved: "dark" | "light" =
        mode === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : mode;
      if (autoDark && isInDarkHours(darkFrom, darkTo)) resolved = "dark";
      const changed =
        root.dataset.theme !== resolved || root.dataset.accent !== accent;
      if (changed && !firstApply) {
        // Animate colors only for the duration of the switch.
        root.classList.add("theme-switching");
        window.setTimeout(() => root.classList.remove("theme-switching"), 350);
      }
      firstApply = false;
      root.dataset.theme = resolved;
      root.dataset.accent = accent;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute(
          "content",
          resolved === "dark" ? "#000000" : "#ffffff",
        );
      }
    };
    apply();

    // Re-evaluate every 5 minutes for auto-dark transitions.
    const timer = autoDark ? setInterval(apply, 5 * 60 * 1000) : null;

    if (mode === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => {
        mql.removeEventListener("change", apply);
        if (timer) clearInterval(timer);
      };
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, accent, autoDark, darkFrom, darkTo]);

  return <>{children}</>;
}
