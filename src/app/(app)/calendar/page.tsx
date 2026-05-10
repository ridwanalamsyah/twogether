"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  useDeadlines,
  useSkripsiBimbingan,
  useTransactions,
  useAllItems,
  useAllEntries,
} from "@/stores/data";
import { formatDateShort, todayISO } from "@/lib/utils";
import { ALL_HOLIDAYS } from "@/data/holidays";
import {
  indonesianDayOf,
  type ClassItem,
} from "@/data/classes";

interface Entry {
  kind:
    | "skripsi"
    | "deadline"
    | "tx"
    | "holiday"
    | "anniv"
    | "datenight"
    | "maintenance"
    | "meal"
    | "subscription"
    | "debt"
    | "period"
    | "class"
    | "item";
  label: string;
  href?: string;
  emoji: string;
}

export default function CalendarPage() {
  const userId = useAuth((s) => s.userId);
  const deadlines = useDeadlines(userId);
  const bimbingan = useSkripsiBimbingan(userId);
  const txs = useTransactions(userId);
  const items = useAllItems(userId);
  const entries = useAllEntries(userId);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    const push = (date: string, e: Entry) => {
      const arr = map.get(date) ?? [];
      arr.push(e);
      map.set(date, arr);
    };
    for (const d of deadlines ?? []) {
      push(d.date, { kind: "deadline", label: d.title, emoji: "📌" });
    }
    for (const b of bimbingan ?? []) {
      push(b.date, {
        kind: "skripsi",
        label: b.topic,
        emoji: "🎓",
        href: "/skripsi",
      });
    }
    for (const t of txs ?? []) {
      push(t.date, {
        kind: "tx",
        label: `${t.kind === "in" ? "+" : "-"} ${t.category}`,
        emoji: t.kind === "in" ? "💰" : "💸",
      });
    }
    // Hari libur Indonesia
    for (const h of ALL_HOLIDAYS) {
      push(h.date, {
        kind: "holiday",
        label: h.name,
        emoji: h.type === "libur" ? "🇮🇩" : "📅",
      });
    }
    // Items: anniv, datenight, maintenance, subscription, meal, debt
    const ITEM_MAP: Record<string, { emoji: string; href: string; kind: Entry["kind"] }> = {
      anniv: { emoji: "❤️", href: "/kita", kind: "anniv" },
      datenight: { emoji: "🍽️", href: "/kita", kind: "datenight" },
      maintenance: { emoji: "🔧", href: "/rumah", kind: "maintenance" },
      meal: { emoji: "🍲", href: "/rumah", kind: "meal" },
      subscription: { emoji: "📺", href: "/uang", kind: "subscription" },
      debt: { emoji: "💳", href: "/uang", kind: "debt" },
      gift: { emoji: "🎁", href: "/list", kind: "item" },
      bucket: { emoji: "📌", href: "/kita", kind: "item" },
      surprise: { emoji: "🎉", href: "/kita", kind: "item" },
      wishlist: { emoji: "🛒", href: "/list", kind: "item" },
    };
    for (const it of items ?? []) {
      const cfg = ITEM_MAP[it.kind];
      if (!cfg) continue;
      const date = it.due ?? it.date;
      if (!date) continue;
      push(date, {
        kind: cfg.kind,
        label: it.title,
        emoji: cfg.emoji,
        href: cfg.href,
      });
      // Recurring anniv: project to current year too
      if (it.kind === "anniv") {
        try {
          const m = date.slice(5, 7);
          const d = date.slice(8, 10);
          for (let y = 2025; y <= 2027; y++) {
            const projected = `${y}-${m}-${d}`;
            if (projected !== date) {
              push(projected, {
                kind: "anniv",
                label: `${it.title} (anniv)`,
                emoji: "❤️",
                href: "/kita",
              });
            }
          }
        } catch {}
      }
    }
    // Jadwal kuliah — read from items kind="class"
    const userClasses: ClassItem[] = [];
    for (const it of items ?? []) {
      if (it.kind !== "class" || !it.payload) continue;
      try {
        const p = JSON.parse(it.payload) as ClassItem;
        userClasses.push({
          ...p,
          title: it.title,
          lecturer: it.who ?? p.lecturer,
        });
      } catch {
        // ignore
      }
    }
    if (userClasses.length > 0) {
      const startMark = new Date(cursor.y, cursor.m - 1, 1);
      const endMark = new Date(cursor.y, cursor.m + 2, 0);
      for (
        let d = new Date(startMark);
        d <= endMark;
        d.setDate(d.getDate() + 1)
      ) {
        const dayName = indonesianDayOf(d);
        const classes = userClasses.filter((c) => c.day === dayName);
        if (classes.length > 0) {
          const iso = d.toISOString().slice(0, 10);
          for (const c of classes) {
            push(iso, {
              kind: "class",
              label: `${c.start} ${c.title}`,
              emoji: "📚",
              href: "/jadwal",
            });
          }
        }
      }
    }
    // Period prediction (next cycle ~28 days from last log)
    const periodEntries = (entries ?? []).filter((e) => e.kind === "period");
    if (periodEntries.length > 0) {
      const last = periodEntries.sort((a, b) => b.date.localeCompare(a.date))[0];
      const lastD = new Date(last.date);
      for (let i = 1; i <= 6; i++) {
        const next = new Date(lastD);
        next.setDate(next.getDate() + i * 28);
        push(next.toISOString().slice(0, 10), {
          kind: "period",
          label: "Prediksi siklus",
          emoji: "🌸",
          href: "/sehat",
        });
      }
    }
    return map;
  }, [deadlines, bimbingan, txs, items, entries, cursor]);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const last = new Date(cursor.y, cursor.m + 1, 0);
    const pad = (first.getDay() + 6) % 7;
    const days: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < pad; i++) {
      const d = new Date(cursor.y, cursor.m, -pad + i + 1);
      days.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(cursor.y, cursor.m, d);
      days.push({ date: dt.toISOString().slice(0, 10), inMonth: true });
    }
    const tail = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= tail; i++) {
      const d = new Date(cursor.y, cursor.m + 1, i);
      days.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    return days;
  }, [cursor]);

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" },
  );
  const today = todayISO();
  const [focused, setFocused] = useState<string>(today);

  const focusedEntries = byDate.get(focused) ?? [];

  return (
    <div className="animate-in">
      <AppHeader title="Kalender" />

      <div className="px-5 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setCursor((c) =>
                c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 },
              )
            }
            className="rounded-md px-2 py-1 text-text-2 active:opacity-50"
          >
            ‹
          </button>
          <div className="text-[14px] font-medium tracking-tight">{monthName}</div>
          <button
            onClick={() =>
              setCursor((c) =>
                c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 },
              )
            }
            className="rounded-md px-2 py-1 text-text-2 active:opacity-50"
          >
            ›
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-text-4">
          {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5">
          {monthDays.map((d) => {
            const has = (byDate.get(d.date) ?? []).length > 0;
            const isToday = d.date === today;
            const isFocused = d.date === focused;
            return (
              <button
                key={d.date}
                onClick={() => setFocused(d.date)}
                className={`relative flex aspect-square items-center justify-center rounded-md text-[12px] ${
                  isFocused
                    ? "bg-text-1 text-bg-app font-medium"
                    : isToday
                      ? "text-text-1 font-medium"
                      : d.inMonth
                        ? "text-text-2"
                        : "text-text-5"
                }`}
              >
                {parseInt(d.date.slice(-2))}
                {has && !isFocused && (
                  <span className="absolute bottom-1 h-[3px] w-[3px] rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-4">
            {formatDateShort(focused)}
          </div>
          {(() => {
            const dt = new Date(focused);
            const indoDay = indonesianDayOf(dt);
            const userClasses: ClassItem[] = [];
            for (const it of items ?? []) {
              if (it.kind !== "class" || !it.payload) continue;
              try {
                const p = JSON.parse(it.payload) as ClassItem;
                userClasses.push({
                  ...p,
                  title: it.title,
                  lecturer: it.who ?? p.lecturer,
                });
              } catch {
                // ignore
              }
            }
            const classes = userClasses.filter((c) => c.day === indoDay);
            if (classes.length === 0) return null;
            return (
              <div className="mb-3 rounded-md border border-border p-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-text-4">
                  Jadwal kuliah {indoDay}
                </div>
                {classes.sort((a, b) => a.start.localeCompare(b.start)).map((c, i) => (
                  <div key={i} className="flex items-baseline justify-between py-0.5 text-[11px]">
                    <span className="text-text-1">{c.title}</span>
                    <span className="text-text-3">{c.start}–{c.end}{c.room ? ` · ${c.room}` : ""}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {focusedEntries.length === 0 ? (
            <div className="border-y border-border py-3 text-[12px] text-text-4">
              Tidak ada agenda.
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {focusedEntries.map((e, i) => {
                const content = (
                  <div className="flex items-center gap-2 py-2.5">
                    <span className="text-[12px]">{e.emoji}</span>
                    <span className="flex-1 truncate text-[13px] text-text-1">{e.label}</span>
                  </div>
                );
                return (
                  <li key={i}>
                    {e.href ? <Link href={e.href} className="block active:opacity-60">{content}</Link> : content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
