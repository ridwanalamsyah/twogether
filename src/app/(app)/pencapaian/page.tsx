"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { AccentBtn, Empty, ListBox, Section } from "@/components/tracker/Section";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { useEntries, useItems, upsertItem } from "@/stores/data";
import { useTransactions, useGoals, useDeposits } from "@/stores/data";
import { todayISO } from "@/lib/utils";
import {
  BADGES,
  buildStreakTable,
  type AggData,
  type BadgeDef,
} from "@/services/achievements";
import type { EntryRecord, ItemRecord } from "@/lib/db";

type Tab = "streak" | "badge" | "feed";

export default function PencapaianPage() {
  const [tab, setTab] = useState<Tab>("streak");
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Pencapaian"
        subtitle="Streak · badge · apresiasi"
        actions={
          <Link href="/home" className="text-[12px] text-text-3 active:opacity-50">
            Tutup
          </Link>
        }
      />
      <div className="px-5">
        {/* Tabs (underline style) */}
        <div className="mb-2 flex gap-6 border-b border-border text-[13px]">
          {(
            [
              ["streak", "Streak"],
              ["badge", "Badge"],
              ["feed", "Aktivitas"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 py-3 ${
                tab === k
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-3"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "streak" && <StreakTab />}
        {tab === "badge" && <BadgeTab />}
        {tab === "feed" && <FeedTab />}
      </div>
    </div>
  );
}

/* ───── Aggregator (returns memoized AggData) ───── */

function useAggData(): AggData | null {
  const userId = useAuth((s) => s.userId);
  const water = useEntries(userId, "water") ?? [];
  const pomodoro = useEntries(userId, "pomodoro") ?? [];
  const journal = useEntries(userId, "journal") ?? [];
  const exercise = useEntries(userId, "exercise") ?? [];
  const mood = useEntries(userId, "mood") ?? [];
  const sleep = useEntries(userId, "sleep") ?? [];
  const weight = useEntries(userId, "weight") ?? [];
  const appreciation = useEntries(userId, "apresiasi") ?? [];

  const subscription = useItems(userId, "subscription") ?? [];
  const debt = useItems(userId, "debt") ?? [];
  const anniversary = useItems(userId, "anniv") ?? [];
  const dateNight = useItems(userId, "datenight") ?? [];
  const bucket = useItems(userId, "bucket") ?? [];
  const reading = useItems(userId, "book") ?? [];

  const txs = useTransactions(userId) ?? [];
  const goals = useGoals(userId) ?? [];
  const deposits = useDeposits(userId) ?? [];

  return useMemo<AggData>(() => {
    const entriesByKind = new Map<string, { date: string; valueNum?: number }[]>();
    const push = (kind: string, arr: EntryRecord[]) => {
      entriesByKind.set(
        kind,
        arr.map((e) => ({ date: e.date, valueNum: e.valueNum })),
      );
    };
    push("water", water);
    push("pomodoro", pomodoro);
    push("journal", journal);
    push("exercise", exercise);
    push("mood", mood);
    push("sleep", sleep);
    push("weight", weight);
    push("apresiasi", appreciation);

    const itemsByKind = new Map<
      string,
      { date?: string; status?: string; amount?: number; who?: string }[]
    >();
    const pushI = (kind: string, arr: ItemRecord[]) => {
      itemsByKind.set(
        kind,
        arr.map((i) => ({
          date: i.date,
          status: i.status,
          amount: i.amount,
          who: i.who,
        })),
      );
    };
    pushI("subscription", subscription);
    pushI("debt", debt);
    pushI("anniv", anniversary);
    pushI("datenight", dateNight);
    pushI("bucket", bucket);
    pushI("book", reading);

    const totalDeposits = deposits.reduce((s, d) => s + (d.amount ?? 0), 0);
    const totalIncome = txs
      .filter((t) => t.kind === "in")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs
      .filter((t) => t.kind === "out")
      .reduce((s, t) => s + t.amount, 0);

    const goalsCompleted = goals.filter((g) => {
      const sum = deposits
        .filter((d) => d.goalId === g.id)
        .reduce((s, d) => s + d.amount, 0);
      return sum >= g.target;
    }).length;

    return {
      entriesByKind,
      itemsByKind,
      totalDeposits,
      totalIncome,
      totalExpense,
      goalCount: goals.length,
      goalsCompleted,
    };
  }, [
    water,
    pomodoro,
    journal,
    exercise,
    mood,
    sleep,
    weight,
    appreciation,
    subscription,
    debt,
    anniversary,
    dateNight,
    bucket,
    reading,
    txs,
    goals,
    deposits,
  ]);
}

/* ───── Streak tab ───── */

function StreakTab() {
  const data = useAggData();
  if (!data) return <Empty>Belum ada data</Empty>;
  const rows = buildStreakTable(data);
  const anyTotal = rows.reduce((s, r) => s + r.total, 0);
  if (anyTotal === 0) {
    return (
      <Empty>
        Streak akan muncul setelah kamu mulai catat pomodoro, air, jurnal, olahraga, atau mood.
      </Empty>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r) => (
        <div
          key={r.kind}
          className="flex items-center justify-between border-b border-border py-3"
        >
          <div>
            <div className="text-[14px]">{r.label}</div>
            <div className="text-[11px] text-text-3">
              Total {r.total}× · best streak {r.best} hari
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[24px] font-light tabular-nums">
              {r.current}
            </div>
            <div className="text-[10px] text-text-3">hari beruntun</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───── Badge tab ───── */

function BadgeTab() {
  const data = useAggData();
  const userId = useAuth((s) => s.userId);
  const unlocked = useItems(userId, "badge-unlocked") ?? [];
  const unlockedSet = useMemo(
    () => new Set(unlocked.map((i) => i.title)),
    [unlocked],
  );

  // Persist newly-met badges (one-time, idempotent via deterministic id)
  useEffect(() => {
    if (!data || !userId) return;
    for (const b of BADGES) {
      const p = b.check(data);
      if (p >= 1 && !unlockedSet.has(b.id)) {
        const stableId = `badge:${userId}:${b.id}`;
        const feedId = `feed:badge:${userId}:${b.id}`;
        void upsertItem(userId, {
          id: stableId,
          kind: "badge-unlocked",
          title: b.id,
          date: todayISO(),
          payload: JSON.stringify({ badgeId: b.id, at: Date.now() }),
        });
        void upsertItem(userId, {
          id: feedId,
          kind: "kudos-feed",
          title: `Unlock badge: ${b.title}`,
          date: todayISO(),
          payload: JSON.stringify({
            type: "badge",
            badgeId: b.id,
            badgeTitle: b.title,
            at: Date.now(),
          }),
        });
      }
    }
  }, [data, userId, unlockedSet]);

  if (!data) return <Empty>Belum ada data</Empty>;

  const cats = ["Belajar", "Sehat", "Uang", "Kita", "Disiplin"] as const;
  return (
    <div className="mt-3 space-y-5">
      {cats.map((cat) => {
        const list = BADGES.filter((b) => b.category === cat);
        return (
          <div key={cat}>
            <div className="mb-2 text-[10px] uppercase tracking-wider text-text-3">
              {cat}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {list.map((b) => {
                const progress = b.check(data);
                const got = progress >= 1;
                return <BadgeCard key={b.id} b={b} progress={progress} got={got} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BadgeCard({
  b,
  progress,
  got,
}: {
  b: BadgeDef;
  progress: number;
  got: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        got ? "border-text-1" : "border-border opacity-70"
      }`}
    >
      <div
        className={`text-[13px] ${got ? "text-text-1" : "text-text-2"}`}
      >
        {b.title}
      </div>
      <div className="mt-1 text-[10px] leading-tight text-text-3">
        {b.description}
      </div>
      <div className="mt-2 h-[3px] w-full bg-border">
        <div
          className="h-full bg-text-1 transition-all"
          style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-text-3">
        {got ? "Tercapai" : `${Math.round(progress * 100)}%`}
      </div>
    </div>
  );
}

/* ───── Feed (Kudos) tab ───── */

function FeedTab() {
  const userId = useAuth((s) => s.userId);
  const members = useWorkspace((s) => s.members);
  const me = members.find((m) => m.isMe);
  const feed = useItems(userId, "kudos-feed") ?? [];
  const kudos = useItems(userId, "kudos-given") ?? [];

  const kudosCountFor = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of kudos) {
      try {
        const p = JSON.parse(k.payload ?? "{}") as { feedId?: string };
        if (p.feedId) m.set(p.feedId, (m.get(p.feedId) ?? 0) + 1);
      } catch {}
    }
    return m;
  }, [kudos]);

  const myGiven = useMemo(
    () => new Set(kudos.filter((k) => k.who === me?.name).map((k) => {
      try {
        return (JSON.parse(k.payload ?? "{}") as { feedId?: string }).feedId;
      } catch {
        return undefined;
      }
    })),
    [kudos, me],
  );

  // Sorted desc by date
  const sorted = useMemo(
    () =>
      [...feed].sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? "") ||
        (b.createdAt ?? 0) - (a.createdAt ?? 0),
      ),
    [feed],
  );

  if (sorted.length === 0) {
    return (
      <Empty>
        Aktivitas akan muncul saat kamu/partner selesai pomodoro, unlock badge, capai goal, dll.
      </Empty>
    );
  }

  async function sendKudos(feedId: string) {
    if (!userId || !me) return;
    await upsertItem(userId, {
      kind: "kudos-given",
      title: "🔥",
      date: todayISO(),
      who: me.name,
      payload: JSON.stringify({ feedId, at: Date.now() }),
    });
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        new Notification("Mantap! 🔥", {
          body: `${me.name} kasih semangat`,
        });
      } catch {}
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {sorted.slice(0, 50).map((f) => {
        let p: { type?: string; badgeTitle?: string } = {};
        try {
          p = JSON.parse(f.payload ?? "{}") as typeof p;
        } catch {}
        const count = kudosCountFor.get(f.id) ?? 0;
        const given = myGiven.has(f.id);
        const author = f.who ?? me?.name ?? "Kamu";
        return (
          <div
            key={f.id}
            className="flex items-start justify-between gap-3 border-b border-border py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-text-1">
                <span className="font-medium">{author}</span>{" "}
                <span className="text-text-3">·</span>{" "}
                <span className="text-text-2">{f.title}</span>
              </div>
              <div className="mt-1 text-[10px] text-text-3">
                {f.date ?? ""}
                {count > 0 && <> · {count} mantap</>}
              </div>
            </div>
            <button
              onClick={() => sendKudos(f.id)}
              disabled={given}
              className={`shrink-0 rounded-md border px-3 py-1 text-[12px] ${
                given
                  ? "border-border text-text-3"
                  : "border-text-1 text-text-1 active:opacity-50"
              }`}
            >
              {given ? "Mantap! 🔥" : "Mantap! 🔥"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
