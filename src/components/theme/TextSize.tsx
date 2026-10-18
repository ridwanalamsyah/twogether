"use client";

import { useEffect } from "react";

// iOS text size "Large" (the default) makes -apple-system-body 17px.
const IOS_DEFAULT = 17;
// Beyond this the fixed-height bars and cards start to break.
const MIN = 0.9;
const MAX = 1.3;

/**
 * Follows the iPhone's Settings → Display → Text Size. All font sizes are rem
 * (scripts/postcss-font-rem.cjs), so scaling the root font size scales the
 * text. Elsewhere `-apple-system-body` isn't supported and nothing changes.
 */
export function TextSize() {
  useEffect(() => {
    if (typeof CSS === "undefined" || !CSS.supports("font", "-apple-system-body")) return;
    const apply = () => {
      const probe = document.createElement("span");
      probe.style.cssText = "font: -apple-system-body; position: absolute; visibility: hidden;";
      document.body.appendChild(probe);
      const px = parseFloat(getComputedStyle(probe).fontSize) || IOS_DEFAULT;
      probe.remove();
      const scale = Math.min(MAX, Math.max(MIN, px / IOS_DEFAULT));
      document.documentElement.style.fontSize = scale === 1 ? "" : `${16 * scale}px`;
    };
    apply();
    // The setting can change while the app sits in the background.
    const onVisible = () => document.visibilityState === "visible" && apply();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
