import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const momentsPage = readFileSync(
  new URL("../src/app/(app)/moments/page.tsx", import.meta.url),
  "utf8",
);

assert.match(
  momentsPage,
  /const canSubmit = Boolean\(title\.trim\(\) \|\| body\.trim\(\) \|\| voice\);/,
  "moment sheet should allow saving a voice-only note without a typed title",
);

assert.match(
  momentsPage,
  /const cleanTitle = title\.trim\(\) \|\| cleanBody\.slice\(0, 40\) \|\| \(voice \? "Voice note" : ""\);/,
  "voice-only moments should get a fallback title when saved",
);

assert.match(
  momentsPage,
  /body: cleanBody,/,
  "moment sheet should trim body before saving",
);

assert.match(
  momentsPage,
  /disabled=\{!canSubmit\}/,
  "save button should be enabled when a voice recording exists",
);
