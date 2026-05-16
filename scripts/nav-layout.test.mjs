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
  /--nav-bottom-pad:\s*2px;/,
  "bottom nav should sit close to the viewport bottom without a large visual gap",
);

assert.match(
  css,
  /--nav-h:\s*calc\(var\(--nav-content-h\) \+ var\(--nav-bottom-pad\)\);/,
  "content padding should keep using the shared bottom nav height token",
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
  /const VERSION = "twogether-v5";/,
  "service worker cache version should bump when shell spacing changes",
);
