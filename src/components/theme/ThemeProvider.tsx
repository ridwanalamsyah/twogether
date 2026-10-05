"use client";

import { useEffect } from "react";
import { useTheme } from "@/stores/theme";
import { isInDarkHours, useSecurity } from "@/stores/security";
import { bootNative, setNativeStatusBar } from "@/lib/native";

/**
 * Applies `data-theme` and `data-accent` to <html> based on the Zustand
 * theme store. Listens for system color-scheme changes when mode === "system".
 * Also honors the auto-dark schedule (overrides mode in the configured hours).
 */
let firstApply = true;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useTheme((s) => s.mode);
  const accent = useTheme((s) => s.accent);
  const icon = useTheme((s) => s.icon);
  const autoDark = useSecurity((s) => s.autoDark);
  const darkFrom = useSecurity((s) => s.darkFrom);
  const darkTo = useSecurity((s) => s.darkTo);

  useEffect(() => {
    bootNative();
  }, []);

  // Chosen app icon → browser tab + "Add to Home Screen" icon.
  useEffect(() => {
    const href = icon === "rose" ? "/icons/icon-192.png" : `/icons/alt/${icon}-180.png`;
    const set = (rel: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };
    set("icon");
    set("apple-touch-icon");
  }, [icon]);

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
      setNativeStatusBar(resolved);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute(
          "content",
          resolved === "dark" ? "#141015" : "#faf6f1",
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
