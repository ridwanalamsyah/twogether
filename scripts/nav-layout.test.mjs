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
  /--nav-content-h:\s*58px;/,
  "bottom nav content height should remain 58px",
);

assert.match(
  css,
  /--nav-bottom-spacing:\s*calc\(var\(--sab\) \+ 12px\);/,
  "bottom nav should reserve safe-area spacing above the iPhone home indicator",
);

assert.match(
  css,
  /--nav-h:\s*calc\(var\(--nav-content-h\) \+ var\(--nav-bottom-spacing\)\);/,
  "total bottom nav height should include safe-area bottom spacing",
);

assert.match(
  bottomNav,
  /var\(--nav-bottom-spacing/,
  "bottom nav wrapper should offset above the iOS home indicator via --nav-bottom-spacing",
);

assert.doesNotMatch(
  bottomNav,
  /pt-1/,
  "bottom nav should not add extra top padding that pushes labels upward",
);

assert.match(
  bottomNav,
  /grid h-\[var\(--nav-content-h,58px\)\] grid-cols-5/,
  "bottom nav items should keep a fixed shared content height",
);

assert.match(
  serviceWorker,
  /const VERSION = "twogether-v13";/,
  "service worker cache version should bump when shell spacing changes",
);
