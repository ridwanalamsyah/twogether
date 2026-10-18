import assert from "node:assert/strict";

const { placeOf, withPlace, plainTags, summarizePlaces } = await import("@/lib/places");

assert.deepEqual(withPlace(["kencan"], " Kopi Tuku "), ["kencan", "tempat:Kopi Tuku"]);
assert.deepEqual(withPlace(["kencan", "tempat:Lama"], ""), ["kencan"], "clearing the place removes it");
assert.equal(placeOf(["a", "tempat:Monas"]), "Monas");
assert.deepEqual(plainTags(["a", "tempat:Monas"]), ["a"]);
const s = summarizePlaces([
  { date: "2026-01-02", tags: ["tempat:Monas"] },
  { date: "2026-03-01", tags: ["tempat:monas"] },
  { date: "2026-02-01", tags: ["tempat:Kopi"] },
  { date: "2026-04-01", tags: ["tempat:Kopi"], deletedAt: 1 },
]);
assert.deepEqual(s.map((p) => [p.name, p.count, p.first, p.last]), [
  ["Monas", 2, "2026-01-02", "2026-03-01"],
  ["Kopi", 1, "2026-02-01", "2026-02-01"],
]);
console.log("places ok");
