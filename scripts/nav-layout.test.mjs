import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const bottomNav = readFileSync(
  new URL("../src/components/shell/BottomNav.tsx", import.meta.url),
  "utf8",
);
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

assert.match(
  css,
  /--nav-visual-bottom-pad:\s*2px;/,
  "bottom nav should sit close to the viewport bottom without a large visual gap",
);

assert.match(
  css,
  /--nav-safe-bottom:\s*max\(var\(--sab\),\s*0px\);/,
  "bottom nav should know the iOS safe-area height",
);

assert.match(
  css,
  /--nav-bottom-offset:\s*min\(var\(--nav-safe-bottom\),\s*28px\);/,
  "bottom nav should pull into the iOS safe area without fully hiding itself",
);

assert.match(
  css,
  /--nav-bottom-pad:\s*calc\(var\(--nav-visual-bottom-pad\) \+ var\(--nav-bottom-offset\)\);/,
  "bottom nav background should continue through the pulled-up safe area",
);

assert.match(
  css,
  /--nav-h:\s*calc\(\s*var\(--nav-content-h\) \+ var\(--nav-visual-bottom-pad\) \+\s*max\(var\(--nav-safe-bottom\) - var\(--nav-bottom-offset\), 0px\)\s*\);/,
  "content padding should keep using the shared bottom nav height token",
);

assert.match(
  bottomNav,
  /-bottom-\[var\(--nav-bottom-offset\)\]/,
  "bottom nav should extend into the iOS safe area instead of floating above it",
);

assert.doesNotMatch(
  bottomNav,
  /pt-1/,
  "bottom nav should not add extra top padding that pushes labels upward",
);

assert.match(
  bottomNav,
  /grid h-\[var\(--nav-content-h\)\] grid-cols-5/,
  "bottom nav items should keep a fixed shared content height",
);

assert.match(
  serviceWorker,
  /const VERSION = "twogether-v6";/,
  "service worker cache version should bump when shell spacing changes",
);
