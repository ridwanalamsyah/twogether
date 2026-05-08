"use client";

import { getDB } from "@/lib/db";
import { todayISO } from "@/lib/utils";

/**
 * Lightweight in-app notification service.
 *
 * Web Push proper requires a backend (push subscription endpoints, VAPID
 * keys). We use the local Notifications API instead — same UI on iOS Safari
 * 16.4+ when installed as PWA — and schedule reminders via setTimeout while
 * the app/PWA is open. For deadline alerts we also surface an in-app banner.
 */

type NotificationStatus = "default" | "granted" | "denied";

const NOTIF_TIMES_KEY = "bareng:notif-times";

export interface NotifTimes {
  morning: string | null; // "HH:mm" or null
  evening: string | null;
}

export function getNotifTimes(): NotifTimes {
  if (typeof window === "undefined") return { morning: "07:00", evening: "21:00" };
  const raw = localStorage.getItem(NOTIF_TIMES_KEY);
  if (!raw) return { morning: "07:00", evening: "21:00" };
  try {
    return JSON.parse(raw) as NotifTimes;
  } catch {
    return { morning: "07:00", evening: "21:00" };
  }
}

export function setNotifTimes(t: NotifTimes): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIF_TIMES_KEY, JSON.stringify(t));
}

export function notificationStatus(): NotificationStatus {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "denied";
  return Notification.permission as NotificationStatus;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  return result as NotificationStatus;
}

export function showNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    });
  } catch {
    // Some browsers require ServiceWorkerRegistration#showNotification —
    // swallow and rely on in-app banner.
  }
}

/**
 * Scan upcoming deadlines, bills, recurring & budget alerts. Idempotent per
 * session via sessionStorage marker.
 */
export async function scanReminders(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const db = getDB();

  // 1. Deadlines (today / besok)
  const deadlines = await db.deadlines
    .where("userId")
    .equals(userId)
    .filter((r) => !r.deletedAt && !r.done)
    .toArray();
  for (const d of deadlines) {
    const dt = new Date(d.date);
    const isToday = dt.toDateString() === today.toDateString();
    const isTomorrow = dt.toDateString() === tomorrow.toDateString();
    if (!isToday && !isTomorrow) continue;
    const key = `bareng:notify:dl:${d.id}:${d.date}`;
    if (sessionStorage.getItem(key)) continue;
    sessionStorage.setItem(key, "1");
    showNotification(
      isToday ? `Deadline hari ini: ${d.title}` : `Besok: ${d.title}`,
      d.detail ?? `Kategori ${d.category}`,
    );
  }

  // 2. Recurring transactions due today
  const recurring = await db.recurring
    .where("userId")
    .equals(userId)
    .filter((r) => !r.deletedAt && !!r.active)
    .toArray();
  for (const r of recurring) {
    if (r.nextDue !== todayISO()) continue;
    const key = `bareng:notify:rec:${r.id}:${r.nextDue}`;
    if (sessionStorage.getItem(key)) continue;
    sessionStorage.setItem(key, "1");
    showNotification(
      `Tagihan berulang: ${r.category}`,
      `Hari ini jatuh tempo · cek di Tracker`,
    );
  }

  // 3. Maintenance items due in <=3 days
  const items = await db.items
    .where("userId")
    .equals(userId)
    .filter((r) => !r.deletedAt && r.kind === "maintenance" && !!r.due)
    .toArray();
  for (const it of items) {
    if (!it.due) continue;
    const days = Math.ceil(
      (new Date(it.due).getTime() - today.getTime()) / 86_400_000,
    );
    if (days < 0 || days > 3) continue;
    const key = `bareng:notify:mt:${it.id}:${it.due}`;
    if (sessionStorage.getItem(key)) continue;
    sessionStorage.setItem(key, "1");
    showNotification(
      `Maintenance: ${it.title}`,
      days === 0 ? "Jatuh tempo hari ini" : `H-${days}`,
    );
  }

  // 3b. Subscription due in <=3 days
  const subs = await db.items
    .where("userId")
    .equals(userId)
    .filter((r) => !r.deletedAt && r.kind === "subscription" && !!r.due)
    .toArray();
  for (const s of subs) {
    if (!s.due) continue;
    const days = Math.ceil(
      (new Date(s.due).getTime() - today.getTime()) / 86_400_000,
    );
    if (days < 0 || days > 3) continue;
    const key = `bareng:notify:sub:${s.id}:${s.due}`;
    if (sessionStorage.getItem(key)) continue;
    sessionStorage.setItem(key, "1");
    showNotification(
      `Langganan: ${s.title}`,
      days === 0 ? "Jatuh tempo hari ini" : `H-${days} sebelum tagih`,
    );
  }

  // 3c. Anniversary / important dates H-7
  const annivs = await db.items
    .where("userId")
    .equals(userId)
    .filter((r) => !r.deletedAt && r.kind === "anniv" && !!r.due)
    .toArray();
  for (const a of annivs) {
    if (!a.due) continue;
    const days = Math.ceil(
      (new Date(a.due).getTime() - today.getTime()) / 86_400_000,
    );
    if (days < 0 || days > 7) continue;
    const key = `bareng:notify:anv:${a.id}:${a.due}`;
    if (sessionStorage.getItem(key)) continue;
    sessionStorage.setItem(key, "1");
    showNotification(
      `${a.title}`,
      days === 0 ? "Hari ini! 🎉" : `H-${days}`,
    );
  }

  // 3d. Smart: missing daily input (water/mood) past 21:00
  const hour = new Date().getHours();
  if (hour >= 21) {
    const todayIso = todayISO();
    const dailyKinds = [
      { kind: "water", label: "air minum" },
      { kind: "mood", label: "mood" },
    ];
    for (const dk of dailyKinds) {
      const todayCount = await db.entries
        .where("[userId+kind]")
        .equals([userId, dk.kind])
        .filter((r) => !r.deletedAt && r.date === todayIso)
        .count();
      if (todayCount > 0) continue;
      const key = `bareng:notify:miss:${dk.kind}:${todayIso}`;
      if (sessionStorage.getItem(key)) continue;
      sessionStorage.setItem(key, "1");
      showNotification(
        `Lupa catat ${dk.label}?`,
        "Tap Bareng untuk input cepat sebelum tidur.",
      );
    }
  }

  // 4. Budget alerts (>=80% used this month)
  const month = today.toISOString().slice(0, 7);
  const budgets = await db.budgets
    .where("userId")
    .equals(userId)
    .filter((r) => !r.deletedAt)
    .toArray();
  if (budgets.length > 0) {
    const txs = await db.transactions
      .where("userId")
      .equals(userId)
      .filter((r) => !r.deletedAt && r.kind === "out" && r.date.startsWith(month))
      .toArray();
    for (const b of budgets) {
      const spent = txs
        .filter((t) => t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      if (spent / Math.max(1, b.limit) < 0.8) continue;
      const key = `bareng:notify:bg:${b.id}:${month}`;
      if (sessionStorage.getItem(key)) continue;
      sessionStorage.setItem(key, "1");
      showNotification(
        `Budget ${b.category} hampir habis`,
        `Terpakai ${Math.round((spent / b.limit) * 100)}% bulan ini`,
      );
    }
  }
}

/** Backward compat alias. */
export const scanUpcomingDeadlines = scanReminders;

/**
 * Schedule next morning/evening reminder via setTimeout. Only fires while
 * the app/PWA is open in foreground or background tab. iOS Safari requires
 * PWA installed for notifications to work at all.
 */
let morningTimer: number | null = null;
let eveningTimer: number | null = null;

function nextOccurrence(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h ?? 7, m ?? 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function scheduleDailyReminders() {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  const t = getNotifTimes();

  if (morningTimer) {
    window.clearTimeout(morningTimer);
    morningTimer = null;
  }
  if (eveningTimer) {
    window.clearTimeout(eveningTimer);
    eveningTimer = null;
  }

  if (t.morning) {
    morningTimer = window.setTimeout(() => {
      showNotification(
        "Selamat pagi",
        "Cek ringkasan kemarin & target hari ini di Bareng.",
      );
      scheduleDailyReminders();
    }, nextOccurrence(t.morning));
  }
  if (t.evening) {
    eveningTimer = window.setTimeout(() => {
      showNotification(
        "Catat hari ini",
        "Belum input transaksi atau habit hari ini? Catat sekarang.",
      );
      scheduleDailyReminders();
    }, nextOccurrence(t.evening));
  }
}
