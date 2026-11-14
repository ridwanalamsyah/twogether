"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/shell/AppHeader";
import { Empty } from "@/components/tracker/Section";
import { useAuth } from "@/stores/auth";
import { useWorkspace } from "@/stores/workspace";
import { useEntries, useItems, upsertItem } from "@/stores/data";
import { useTransactions, useGoals, useDeposits } from "@/stores/data";
import { todayISO } from "@/lib/utils";
import { konfetti } from "@/lib/konfetti";
import { hapticUnlock } from "@/lib/haptic";
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
  const reduce = useReducedMotion();
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Pencapaian"
        subtitle="Lencana & hari beruntun"
      />
      <div className="px-5">
        {/* Tabs (underline style with layoutId glide) */}
        <div role="tablist" aria-label="Kategori pencapaian" className="mb-2 flex gap-6 border-b border-border text-[13px]">
          {(
            [
              ["streak", "Beruntun"],
              ["badge", "Lencana"],
              ["feed", "Aktivitas"],
            ] as const
          ).map(([k, label]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(k)}
                className={`relative min-h-[44px] py-3 font-medium transition-colors ${
                  active ? "text-text-1" : "text-text-3"
                }`}
              >
                {label}
                {active && (
                  <motion.span
                    layoutId="pencapaian-tab-line"
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-text-1"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 520, damping: 38 }
                    }
                  />
                )}
              </button>
            );
          })}
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
        Hitungan hari beruntun muncul setelah kamu mulai mencatat air, jurnal, olahraga, atau mood.
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
            <div className="text-[12px] text-text-3">
              Total {r.total}× · best streak {r.best} hari
            </div>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-light tabular-nums">
              {r.current}
            </div>
            <div className="text-[12px] text-text-3">hari beruntun</div>
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
    let newUnlocks = 0;
    for (const b of BADGES) {
      const p = b.check(data);
      if (p >= 1 && !unlockedSet.has(b.id)) {
        newUnlocks += 1;
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
    if (newUnlocks > 0) {
      hapticUnlock();
      konfetti({ count: 60 });
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
            <div className="mb-2 text-[12px] section-label text-text-3">
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
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.round(progress * 100));
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
      <div className="mt-1 text-[12px] leading-tight text-text-3">
        {b.description}
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full w-full origin-left bg-text-1"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: reduce ? 0.04 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-1 text-[12px] text-text-3">
        {got ? "Tercapai" : `${pct}%`}
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
        Aktivitas akan muncul saat kamu atau pasangan selesai fokus atau capai target.
      </Empty>
    );
  }

  async function sendKudos(feedId: string) {
    if (!userId || !me) return;
    await upsertItem(userId, {
      kind: "kudos-given",
      title: "Mantap",
      date: todayISO(),
      who: me.name,
      payload: JSON.stringify({ feedId, at: Date.now() }),
    });
    if (
      typeof window !== "undefined" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("Mantap!", {
          body: `${me.name} kasih semangat`,
        });
      } catch {}
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {sorted.slice(0, 50).map((f) => {
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
              <div className="mt-1 text-[12px] text-text-3">
                {f.date ?? ""}
                {count > 0 && <> · {count} mantap</>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => sendKudos(f.id)}
              disabled={given}
              aria-pressed={given}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[12px] border px-3.5 py-2 text-[12px] font-medium ${
                given
                  ? "border-border text-text-3"
                  : "border-text-1 text-text-1 active:opacity-50"
              }`}
            >
              <Flame size={14} aria-hidden="true" />
              <span>{given ? "Terkirim" : "Mantap"}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
