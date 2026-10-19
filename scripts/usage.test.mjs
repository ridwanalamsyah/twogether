import assert from "node:assert/strict";

const { emptyUsage, withVisit, frequent, unused } = await import("@/lib/usage");

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 1);
let u = emptyUsage(t0);
for (let i = 0; i < 6; i++) u = withVisit(u, "/uang", t0);
for (let i = 0; i < 3; i++) u = withVisit(u, "/shalat", t0 + 40 * DAY);
u = withVisit(u, "/zakat", t0 + 40 * DAY);
const all = ["/uang", "/shalat", "/zakat", "/siklus"];

assert.deepEqual(frequent(u, all, t0 + 41 * DAY), ["/shalat", "/uang"], "recent visits outrank old ones; single visits don't count");
assert.deepEqual(unused(emptyUsage(t0), all, t0 + 10 * DAY), [], "nothing is unused before 30 days of counting");
assert.deepEqual(unused(u, all, t0 + 41 * DAY), ["/uang", "/siklus"]);
console.log("usage ok");
