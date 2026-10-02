"use client";

import { Capacitor } from "@capacitor/core";

/** True when running inside the Capacitor iOS/Android shell (not Safari). */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

type HapticKind = "light" | "medium" | "heavy" | "success" | "warning";

/**
 * Real Taptic Engine feedback in the native app. Safari on iOS has no
 * vibration API at all, so this is the only way iPhone users feel taps.
 * Plugins are imported lazily so the web bundle doesn't pay for them.
 */
export function nativeHaptic(kind: HapticKind): boolean {
  if (!isNative()) return false;
  void import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      if (kind === "success") return Haptics.notification({ type: NotificationType.Success });
      if (kind === "warning") return Haptics.notification({ type: NotificationType.Warning });
      const style =
        kind === "heavy"
          ? ImpactStyle.Heavy
          : kind === "medium"
            ? ImpactStyle.Medium
            : ImpactStyle.Light;
      return Haptics.impact({ style });
    })
    .catch(() => undefined);
  return true;
}

/** Match the native status bar to the active theme. */
export function setNativeStatusBar(theme: "light" | "dark"): void {
  if (!isNative()) return;
  void import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) =>
      StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }),
    )
    .catch(() => undefined);
}

let booted = false;

/** One-time native setup: hide the launch screen once React has painted. */
export function bootNative(): void {
  if (booted || !isNative()) return;
  booted = true;
  document.documentElement.classList.add("is-native");
  void import("@capacitor/splash-screen")
    .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
    .catch(() => undefined);
}
