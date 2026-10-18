// Day helpers must use the phone's local day. Run in WIB, the timezone
// where the old toISOString() version put early-morning entries on
// yesterday and local midnight on the day before.
process.env.TZ = "Asia/Jakarta";

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const { isoDay, fromIsoDay, addDays, daysBetween } = await import("../src/lib/dates.ts");

// 04:45 WIB on 18 Oct = 21:45 UTC on 17 Oct (Subuh habit).
assert.equal(isoDay(new Date(2026, 9, 18, 4, 45)), "2026-10-18", "early morning stays today");

const midnight = new Date(2026, 9, 18);
midnight.setHours(0, 0, 0, 0);
assert.equal(isoDay(midnight), "2026-10-18", "local midnight is that same day");

assert.equal(fromIsoDay("2026-10-18").getHours(), 0, "parsed day is local midnight");
assert.equal(isoDay(fromIsoDay("2026-03-01")), "2026-03-01", "round trip");
assert.equal(addDays("2026-02-28", 1), "2026-03-01");
assert.equal(addDays("2026-01-01", -1), "2025-12-31");
assert.equal(daysBetween("2026-10-01", "2026-10-18"), 17);

// Guard: nobody slices the UTC ISO string for a calendar day again.
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}
const src = new URL("../src", import.meta.url).pathname;
const offenders = walk(src).filter(
  (f) => !f.endsWith("lib/dates.ts") && readFileSync(f, "utf8").includes("toISOString().slice(0, 10)"),
);
assert.deepEqual(offenders, [], "use isoDay() from @/lib/dates instead of toISOString().slice(0, 10)");

console.log("dates ok");
