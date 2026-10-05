import type { EntryRecord, ItemRecord, TransactionRecord } from "@/lib/db";
import { addDays, daysBetween, isoDay, parsePayload } from "@/lib/people";
import { billState } from "@/lib/bills";

/**
 * Smart reminders. `upcoming()` lists what deserves a nudge from now on —
 * shown as a Beranda card while it's relevant, and scheduled as phone
 * notifications in the iPhone app (which works even when the app is closed).
 */
export type ReminderType = "catat" | "tagihan" | "anniv" | "tilawah" | "tantangan";

export const REMINDER_TYPES: { id: ReminderType; emoji: string; label: string; hint: string; hour: number; minute: number }[] = [
  { id: "tagihan", emoji: "🧾", label: "Tagihan jatuh tempo", hint: "Sehari sebelum dan di hari jatuh tempo, jam 08.00", hour: 8, minute: 0 },
  { id: "anniv", emoji: "💞", label: "Tanggal penting", hint: "Anniversary & ulang tahun: H-1 dan hari H, jam 08.00", hour: 8, minute: 0 },
  { id: "catat", emoji: "✍️", label: "Catat pengeluaran", hint: "Jam 20.00 kalau hari itu belum ada catatan", hour: 20, minute: 0 },
  { id: "tilawah", emoji: "📖", label: "Target tilawah", hint: "Jam 19.00 kalau bacaan hari itu masih kurang", hour: 19, minute: 0 },
  { id: "tantangan", emoji: "🔥", label: "Tantangan berdua", hint: "Jam 20.30 kalau belum dicentang", hour: 20, minute: 30 },
];

export interface Reminder {
  /** Stable per occurrence, e.g. "tagihan:<billId>:2026-10". */
  id: string;
  type: ReminderType;
  emoji: string;
  text: string;
  href: string;
  /** When to notify. */
  at: Date;
  /** Worth showing on Beranda right now. */
  current: boolean;
}

export interface ReminderData {
  me: string;
  txs: TransactionRecord[];
  bills: ItemRecord[];
  billPaid: EntryRecord[];
  annivs: ItemRecord[];
  khatams: ItemRecord[];
  tilawah: EntryRecord[];
  challenges: ItemRecord[];
  challengeLogs: EntryRecord[];
}

const meta = (t: ReminderType) => REMINDER_TYPES.find((r) => r.id === t)!;

function at(date: string, t: ReminderType): Date {
  const [y, m, d] = date.split("-").map(Number);
  const r = meta(t);
  return new Date(y, m - 1, d, r.hour, r.minute);
}

/** Reminders for the next `days` days (and anything overdue today). */
export function upcoming(data: ReminderData, enabled: Record<ReminderType, boolean>, now = new Date(), days = 7): Reminder[] {
  const today = isoDay(now);
  const out: Reminder[] = [];
  const horizon = addDays(today, days);
  const after = (d: Date) => d.getTime() > now.getTime();

  if (enabled.tagihan) {
    for (const b of data.bills) {
      if (b.status === "archived") continue;
      const s = billState(b, data.billPaid, today);
      if (s.paid || s.finished) continue;
      const name = b.title;
      if (s.daysLeft < 0) {
        out.push({ id: `tagihan:${b.id}:${s.month}:late`, type: "tagihan", emoji: "🧾", text: `${name} telat ${-s.daysLeft} hari`, href: "/tagihan", at: now, current: true });
        continue;
      }
      for (const [d, text] of [
        [addDays(s.due, -1), `${name} jatuh tempo besok`],
        [s.due, `${name} jatuh tempo hari ini`],
      ] as const) {
        if (d < today || d > horizon) continue;
        const when = at(d, "tagihan");
        out.push({ id: `tagihan:${b.id}:${d}`, type: "tagihan", emoji: "🧾", text, href: "/tagihan", at: when, current: d === today });
      }
    }
  }

  if (enabled.anniv) {
    for (const a of data.annivs) {
      if (!a.date) continue;
      for (let i = 0; i <= days; i += 1) {
        const d = addDays(today, i);
        if (d.slice(5) !== a.date.slice(5)) continue;
        const years = Number(d.slice(0, 4)) - Number(a.date.slice(0, 4));
        const label = years > 0 ? `${a.title} yang ke-${years}` : a.title;
        for (const [when, text, isToday] of [
          [addDays(d, -1), `Besok ${label} 💞`, addDays(d, -1) === today],
          [d, `Hari ini ${label} 🎉`, d === today],
        ] as const) {
          if (when < today) continue;
          out.push({ id: `anniv:${a.id}:${when}`, type: "anniv", emoji: "💞", text, href: "/kita", at: at(when, "anniv"), current: isToday });
        }
      }
    }
  }

  if (enabled.catat) {
    const loggedToday = data.txs.some((t) => t.date === today && (t.who || data.me) === data.me);
    for (let i = loggedToday ? 1 : 0; i < days; i += 1) {
      const d = addDays(today, i);
      out.push({
        id: `catat:${d}`,
        type: "catat",
        emoji: "✍️",
        text: "Belum catat pengeluaran hari ini",
        href: "/tracker",
        at: at(d, "catat"),
        current: i === 0 && now.getHours() >= 19,
      });
    }
  }

  if (enabled.tilawah) {
    const k = [...data.khatams].filter((x) => x.status !== "done").sort((a, b) => b.createdAt - a.createdAt)[0];
    if (k?.date && k.date >= today) {
      const together = parsePayload(k.payload, { together: true }).together;
      const logs = data.tilawah.filter((l) => parsePayload(l.payload, { khatamId: "" }).khatamId === k.id);
      const progress = logs.filter((l) => together || (l.who || data.me) === data.me).reduce((s, l) => s + (l.valueNum ?? 0), 0);
      const perDay = Math.ceil(Math.max(0, 604 - progress) / Math.max(1, daysBetween(today, k.date) + 1));
      const mineToday = logs.filter((l) => l.date === today && (l.who || data.me) === data.me).reduce((s, l) => s + (l.valueNum ?? 0), 0);
      if (perDay > 0 && mineToday < perDay) {
        out.push({
          id: `tilawah:${today}`,
          type: "tilawah",
          emoji: "📖",
          text: `Tilawah hari ini kurang ${perDay - mineToday} halaman`,
          href: "/tilawah",
          at: at(today, "tilawah"),
          current: now.getHours() >= 18,
        });
      }
      for (let i = 1; i < days && addDays(today, i) <= k.date; i += 1) {
        const d = addDays(today, i);
        out.push({ id: `tilawah:${d}`, type: "tilawah", emoji: "📖", text: `Jangan lupa tilawah ${perDay} halaman hari ini`, href: "/tilawah", at: at(d, "tilawah"), current: false });
      }
    }
  }

  if (enabled.tantangan) {
    for (const c of data.challenges) {
      if (c.status === "done" || !c.date || !c.due) continue;
      const done = (d: string) =>
        data.challengeLogs.some((l) => l.date === d && (l.who || data.me) === data.me && parsePayload(l.payload, { challengeId: "" }).challengeId === c.id);
      for (let i = 0; i < days; i += 1) {
        const d = addDays(today, i);
        if (d < c.date || d > c.due || done(d)) continue;
        out.push({
          id: `tantangan:${c.id}:${d}`,
          type: "tantangan",
          emoji: "🔥",
          text: `Belum centang "${c.title}" hari ini`,
          href: "/tantangan",
          at: at(d, "tantangan"),
          current: i === 0 && now.getHours() >= 18,
        });
      }
    }
  }

  return out.filter((r) => r.current || after(r.at)).sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Small positive int id for the native scheduler, stable per reminder id. */
export function notificationId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2_000_000_000) + 1;
}
