import assert from "node:assert/strict";

const { shouldApplyRemote, nextCursor } = await import("../src/services/merge.ts");

assert.equal(shouldApplyRemote(undefined, { updatedAt: 1 }), true, "new record is added");
assert.equal(
  shouldApplyRemote({ updatedAt: 100, dirty: 1 }, { updatedAt: 500 }),
  false,
  "an unsent local edit is never overwritten",
);
assert.equal(
  shouldApplyRemote({ updatedAt: 500, dirty: 0 }, { updatedAt: 100 }),
  false,
  "an older server copy doesn't roll the record back",
);
assert.equal(shouldApplyRemote({ updatedAt: 100, dirty: 0 }, { updatedAt: 500 }), true, "newer server copy wins");
assert.equal(shouldApplyRemote({ updatedAt: 100, dirty: 0 }, { updatedAt: 100 }), true, "same version is harmless");

assert.equal(nextCursor(null, []), null);
assert.equal(nextCursor(50, [{ updatedAt: 10 }, { updatedAt: 80 }]), 80);
assert.equal(nextCursor(90, [{ updatedAt: 10 }]), 90, "cursor never moves backwards");

console.log("merge ok");
