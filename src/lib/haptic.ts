/**
 * Lightweight haptic helper. Uses Vibration API where available, no-op
 * elsewhere (iOS Safari ignores vibrate but doesn't throw, Capacitor wrap
 * exposes Haptics natively if installed later).
 */

import { nativeHaptic } from "@/lib/native";

function vibrate(ms: number | number[]) {
  if (typeof navigator === "undefined") return;
  // navigator.vibrate undefined on iOS Safari; guard gracefully.
  const fn = (
    navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean;
    }
  ).vibrate;
  if (typeof fn === "function") {
    try {
      // TS lib.dom marks vibrate() with `Iterable<number>`; runtime accepts
      // a plain number too. Cast to satisfy both browsers and TS.
      (fn as (pattern: number | number[]) => boolean).call(navigator, ms);
    } catch {
      /* swallow — some browsers throw if not user-activated */
    }
  }
}

/** Short tap — confirms a click landed. */
export function hapticTap() {
  if (nativeHaptic("light")) return;
  vibrate(8);
}

/** Light double-buzz — small celebrate. */
export function hapticSuccess() {
  if (nativeHaptic("success")) return;
  vibrate([20, 40, 20]);
}

/** Heavier — for unlocks or major events. */
export function hapticUnlock() {
  if (nativeHaptic("heavy")) return;
  vibrate([40, 60, 40, 60, 80]);
}

/** Warning — short triple. */
export function hapticWarn() {
  if (nativeHaptic("warning")) return;
  vibrate([10, 30, 10, 30, 10]);
}
