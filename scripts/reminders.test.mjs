// Contextual Beranda + reminders: the anniversary/round-day check and the
// "belum kirim kabar" nudge.
import assert from "node:assert/strict";

const { celebrationToday, daysTogether } = await import("@/lib/anniv");
const { upcoming } = await import("@/lib/reminders");

assert.deepEqual(celebrationToday("2024-02-14", "2026-02-14"), { kind: "anniv", years: 2 });
assert.deepEqual(celebrationToday("2024-02-14", "2024-05-24"), { kind: "milestone", days: 100 });
assert.equal(celebrationToday("2024-02-14", "2024-02-14"), null, "the start day itself isn't a celebration");
assert.equal(celebrationToday("2024-02-14", "2026-03-01"), null);
assert.equal(celebrationToday(null), null);
assert.equal(daysTogether("2026-10-01", new Date(2026, 9, 18, 3, 0).getTime()), 17, "counts from local midnight");

const base = {
  me: "Ridwan",
  partner: "Alyaa",
  txs: [], bills: [], billPaid: [], annivs: [], khatams: [], tilawah: [], challenges: [], challengeLogs: [],
  pings: [],
};
const on = { tagihan: false, anniv: false, catat: false, tilawah: false, tantangan: false, kabar: true };
const night = new Date(2026, 9, 18, 21, 30);

let list = upcoming(base, on, night);
assert.ok(list.some((r) => r.type === "kabar" && r.current), "nudge at night when nothing was sent");
list = upcoming({ ...base, pings: [{ date: "2026-10-18", who: "Ridwan" }] }, on, night);
assert.ok(!list.some((r) => r.type === "kabar" && r.current), "no nudge after sending one today");
list = upcoming({ ...base, partner: null }, on, night);
assert.ok(!list.some((r) => r.type === "kabar"), "no partner, no nudge");

console.log("reminders ok");

const { yearsMonths } = await import("@/lib/anniv");
assert.deepEqual(yearsMonths("2024-10-19", new Date(2026, 9, 19, 3)), { years: 2, months: 0 }, "anniversary day is whole years");
assert.deepEqual(yearsMonths("2024-07-20", new Date(2026, 9, 19)), { years: 2, months: 2 });
console.log("years/months ok");
