"use client";

import {
  Bell,
  BookOpen,
  Flame,
  Heart,
  MessageCircleHeart,
  PenLine,
  Receipt,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useEntries, useItems, useTransactions } from "@/stores/data";
import { useReminderPrefs } from "@/stores/reminders";
import { usePeople, isoDay } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { isNative } from "@/lib/native";
import { IconTile, type IconSpec } from "@/lib/icons";
import {
  notificationId,
  upcoming,
  type Reminder,
  type ReminderData,
  type ReminderType,
} from "@/lib/reminders";
import { notificationText } from "@/stores/privacy";

export const REMINDER_ICON: Record<ReminderType, IconSpec> = {
  tagihan: { Icon: Receipt, tint: "var(--tint-red)" },
  anniv: { Icon: Heart, tint: "var(--tint-pink)" },
  catat: { Icon: PenLine, tint: "var(--tint-amber)" },
  tilawah: { Icon: BookOpen, tint: "var(--tint-emerald)" },
  tantangan: { Icon: Flame, tint: "var(--tint-orange)" },
  kabar: { Icon: MessageCircleHeart, tint: "var(--tint-rose)" },
};

function useReminderData(): ReminderData | null {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const txs = useTransactions(userId);
  const bills = useItems(userId, "bill");
  const billPaid = useEntries(userId, "bill-paid");
  const annivs = useItems(userId, "anniv");
  const khatams = useItems(userId, "khatam");
  const tilawah = useEntries(userId, "tilawah");
  const challenges = useItems(userId, "challenge");
  const challengeLogs = useEntries(userId, "challenge-log");
  const pings = useEntries(userId, "ping");
  const partnerName = partner ? nick(partner) : null;
  return useMemo(
    () =>
      txs && bills && billPaid && annivs && khatams && tilawah && challenges && challengeLogs && pings
        ? { me, txs, bills, billPaid, annivs, khatams, tilawah, challenges, challengeLogs, pings, partner: partnerName }
        : null,
    [me, txs, bills, billPaid, annivs, khatams, tilawah, challenges, challengeLogs, pings, partnerName],
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
  const reduced = useReducedMotion();
  const today = isoDay(new Date());
  const hidden = new Set(dismissed.date === today ? dismissed.ids : []);
  const list = all.filter((r) => r.current && !hidden.has(r.id)).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="surface p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-text-1">
        <Bell size={16} className="text-accent" aria-hidden /> Pengingat
      </div>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {list.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0.04 : 0.18 }}
              className="flex items-center gap-1.5 rounded-2xl bg-bg-elev1 pr-1"
            >
              <Link href={r.href} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
                <IconTile spec={REMINDER_ICON[r.type]} size={34} radius={10} />
                <span className="line-clamp-2 text-[14px] font-medium leading-snug text-text-1">{r.text}</span>
              </Link>
              <button
                type="button"
                onClick={() => dismiss(r.id, today)}
                aria-label="Sembunyikan untuk hari ini"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-3 transition-transform active:scale-90"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full hover:bg-bg-elev2">
                  <X size={15} aria-hidden />
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
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
              ...notificationText("Twogether", r.text),
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
