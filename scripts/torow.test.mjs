import assert from "node:assert/strict";

const { toRow } = await import("@/lib/supabase");

// Restoring from Baru dihapus must clear deleted_at on the server.
const restored = toRow("transactions", { id: "t1", userId: "u", amount: 1000, updatedAt: 1, createdAt: 1 }, "ws", "auth");
assert.equal(restored.deleted_at, null, "deleted_at is sent as null when not deleted");
const deleted = toRow("transactions", { id: "t1", amount: 1000, deletedAt: Date.UTC(2026, 0, 1) }, "ws", "auth");
assert.equal(deleted.deleted_at, "2026-01-01T00:00:00.000Z");

// bigint money columns: decimals would be rejected and jam the queue.
assert.equal(toRow("transactions", { id: "t", amount: 12.5 }, "ws", "auth").amount, 13);
assert.equal(toRow("goals", { id: "g", target: 99.4 }, "ws", "auth").target, 99);

// A cleared optional field on items is sent as null (not dropped).
const item = toRow("items", { id: "i", kind: "bill", title: "Listrik", due: undefined, amount: undefined }, "ws", "auth");
assert.ok("due" in item && item.due === null, "cleared due date is null");
assert.equal(JSON.parse(JSON.stringify(item)).due, null);
// …but other tables keep omitting undefined (their columns may be not-null with defaults).
const moment = toRow("moments", { id: "m", title: "x", body: "y", encrypted: undefined }, "ws", "auth");
assert.equal(JSON.parse(JSON.stringify(moment)).encrypted, undefined);

// Local-only fields never leave the phone.
const r = toRow("transactions", { id: "t", dirty: 1, userId: "local", passwordHash: "h" }, "ws", "auth");
assert.ok(!("dirty" in r) && !("passwordHash" in r));
assert.equal(r.user_id, "auth");
console.log("toRow ok");
