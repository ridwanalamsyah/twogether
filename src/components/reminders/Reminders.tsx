"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useEntries, useItems, useTransactions } from "@/stores/data";
import { useReminderPrefs } from "@/stores/reminders";
import { usePeople, isoDay } from "@/lib/people";
import { isNative } from "@/lib/native";
import { notificationId, upcoming, type Reminder, type ReminderData } from "@/lib/reminders";

function useReminderData(): ReminderData | null {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const txs = useTransactions(userId);
  const bills = useItems(userId, "bill");
  const billPaid = useEntries(userId, "bill-paid");
  const annivs = useItems(userId, "anniv");
  const khatams = useItems(userId, "khatam");
  const tilawah = useEntries(userId, "tilawah");
  const challenges = useItems(userId, "challenge");
  const challengeLogs = useEntries(userId, "challenge-log");
  return useMemo(
    () =>
      txs && bills && billPaid && annivs && khatams && tilawah && challenges && challengeLogs
        ? { me, txs, bills, billPaid, annivs, khatams, tilawah, challenges, challengeLogs }
        : null,
    [me, txs, bills, billPaid, annivs, khatams, tilawah, challenges, challengeLogs],
  );
}

export function useReminders(): Reminder[] {
  const data = useReminderData();
  const enabled = useReminderPrefs((s) => s.enabled);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5 * 60_000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (data ? upcoming(data, enabled) : []), [data, enabled, tick]);
}

/** Beranda card — only renders while something needs attention today. */
export function RemindersWidget() {
  const all = useReminders();
  const dismissed = useReminderPrefs((s) => s.dismissed);
  const dismiss = useReminderPrefs((s) => s.dismiss);
  const today = isoDay(new Date());
  const hidden = new Set(dismissed.date === today ? dismissed.ids : []);
  const list = all.filter((r) => r.current && !hidden.has(r.id)).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="surface p-4">
      <div className="mb-2 text-[15px] font-bold text-text-1">🔔 Pengingat</div>
      <ul className="space-y-1.5">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-2xl bg-bg-elev1 pr-1">
            <Link href={r.href} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5">
              <span className="text-[18px]">{r.emoji}</span>
              <span className="truncate text-[14px] font-medium text-text-1">{r.text}</span>
            </Link>
            <button onClick={() => dismiss(r.id, today)} aria-label="Sembunyikan untuk hari ini" className="grid h-8 w-8 shrink-0 place-items-center text-[13px] text-text-4">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MAX_SCHEDULED = 48;

/**
 * iPhone app only: keeps the next week's reminders scheduled as local
 * notifications, so they arrive even when Twogether is closed. Re-synced
 * whenever the data changes.
 */
export function ReminderScheduler() {
  const reminders = useReminders();
  const last = useRef("");
  useEffect(() => {
    if (!isNative()) return;
    const future = reminders.filter((r) => r.at.getTime() > Date.now() + 30_000).slice(0, MAX_SCHEDULED);
    const sig = future.map((r) => `${r.id}@${r.at.getTime()}`).join("|");
    if (sig === last.current) return;
    const t = setTimeout(async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display === "prompt" && future.length) perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
        const pending = await LocalNotifications.getPending();
        const ours = pending.notifications.filter((n) => (n.extra as { twogether?: boolean } | undefined)?.twogether);
        if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
        if (future.length) {
          await LocalNotifications.schedule({
            notifications: future.map((r) => ({
              id: notificationId(r.id),
              title: `${r.emoji} Twogether`,
              body: r.text,
              schedule: { at: r.at, allowWhileIdle: true },
              extra: { twogether: true, href: r.href },
            })),
          });
        }
        last.current = sig;
      } catch {
        /* plugin missing in an older app build */
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [reminders]);

  // Tapping a notification opens the matching page.
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    void import("@capacitor/local-notifications")
      .then(({ LocalNotifications }) =>
        LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
          const href = (e.notification.extra as { href?: string } | undefined)?.href;
          if (href) window.location.href = href;
        }),
      )
      .then((h) => (remove = () => void h.remove()))
      .catch(() => {});
    return () => remove?.();
  }, []);
  return null;
}
