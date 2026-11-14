"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Droplets,
  Flame,
  Mail,
  Share2,
  Target,
  Wallet,
} from "lucide-react";
import { IconTile, type IconSpec } from "@/lib/icons";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  useTransactions,
  useDeposits,
  useAllEntries,
  useMoments,
  useItems,
} from "@/stores/data";
import { formatRupiahShort as formatRupiah } from "@/lib/utils";
import { usePeople } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { daysTogether, relationshipStart } from "@/lib/anniv";
import { drawWrappedCard } from "@/lib/wrappedCard";
import { saveFile } from "@/lib/share";
import { hapticSuccess } from "@/lib/haptic";

const YEAR = new Date().getFullYear();

export default function WrappedPage() {
  const userId = useAuth((s) => s.userId);
  const txs = useTransactions(userId) ?? [];
  const deps = useDeposits(userId) ?? [];
  const entries = useAllEntries(userId) ?? [];
  const moments = useMoments(userId) ?? [];

  const stats = useMemo(() => {
    const yearStart = new Date(YEAR, 0, 1).getTime();
    const yearEnd = new Date(YEAR + 1, 0, 1).getTime();
    const inYear = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= yearStart && t < yearEnd;
    };

    let income = 0;
    let expense = 0;
    const catTotals = new Map<string, number>();
    for (const t of txs) {
      if (!inYear(t.date)) continue;
      if (t.kind === "in") income += t.amount;
      if (t.kind === "out") {
        expense += t.amount;
        catTotals.set(t.category, (catTotals.get(t.category) ?? 0) + t.amount);
      }
    }
    const topCats = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    let saved = 0;
    for (const d of deps) {
      if (inYear(d.date)) saved += d.amount;
    }

    const dayCounts = new Map<string, number>();
    for (const e of entries) {
      if (!inYear(e.date)) continue;
      const d = e.date.slice(0, 10);
      dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
    }
    const totalActiveDays = dayCounts.size;

    let topDay: string | null = null;
    let topCount = 0;
    for (const [d, c] of dayCounts) {
      if (c > topCount) {
        topCount = c;
        topDay = d;
      }
    }

    let pomodoroMinutes = 0;
    let waterCups = 0;
    let moodSum = 0;
    let moodCount = 0;
    let exerciseSessions = 0;
    for (const e of entries) {
      if (!inYear(e.date)) continue;
      if (e.kind === "pomodoro") pomodoroMinutes += e.valueNum ?? 0;
      if (e.kind === "water") waterCups += e.valueNum ?? 0;
      if (e.kind === "mood" && e.valueNum != null) {
        moodSum += e.valueNum;
        moodCount += 1;
      }
      if (e.kind === "exercise") exerciseSessions += 1;
    }

    const momentsCount = moments.filter((m) => inYear(m.date)).length;

    return {
      income,
      expense,
      net: income - expense,
      saved,
      topCats,
      totalActiveDays,
      topDay,
      topCount,
      pomodoroHours: Math.round(pomodoroMinutes / 60),
      waterCups,
      avgMood: moodCount ? +(moodSum / moodCount).toFixed(2) : 0,
      exerciseSessions,
      momentsCount,
    };
  }, [txs, deps, entries, moments]);

  return (
    <div className="animate-in pb-24">
      <AppHeader
        title={`Wrapped ${YEAR}`}
        subtitle="Ringkasan tahunan kalian"
      />

      <div className="space-y-3 px-5 mt-3">
        <ShareCard activeDays={stats.totalActiveDays} moments={stats.momentsCount} />
        <Card spec={{ Icon: CalendarDays, tint: "var(--accent)" }} title="Hari aktif">
          <Big>{stats.totalActiveDays}</Big>
          <Sub>hari isi tracker tahun ini</Sub>
        </Card>

        <Card spec={{ Icon: Flame, tint: "var(--accent)" }} title="Hari tersibuk">
          <Big>
            {stats.topDay
              ? new Date(stats.topDay).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })
              : "Belum ada"}
          </Big>
          <Sub>{stats.topCount} catatan dalam sehari</Sub>
        </Card>

        <Card spec={{ Icon: Wallet, tint: "var(--accent)" }} title="Keuangan">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Masuk" value={formatRupiah(stats.income)} tone="emerald" />
            <Stat label="Keluar" value={formatRupiah(stats.expense)} tone="rose" />
            <Stat label="Net" value={formatRupiah(stats.net)} tone="default" />
          </div>
          {stats.topCats.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[12px] section-label text-text-3">
                Top 3 kategori boros
              </div>
              {stats.topCats.map(([cat, amt], i) => (
                <div key={cat} className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-text-1">
                    {i + 1}. {cat}
                  </span>
                  <span className="tabular-nums text-text-3">
                    {formatRupiah(amt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card spec={{ Icon: Target, tint: "var(--accent)" }} title="Tabungan">
          <Big>{formatRupiah(stats.saved)}</Big>
          <Sub>setoran goal tahun ini</Sub>
        </Card>

        <Card spec={{ Icon: BookOpen, tint: "var(--accent)" }} title="Belajar">
          <Big>{stats.pomodoroHours} jam</Big>
          <Sub>fokus dengan pomodoro</Sub>
        </Card>

        <Card spec={{ Icon: Droplets, tint: "var(--accent)" }} title="Sehat">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Air" value={`${stats.waterCups} gelas`} tone="default" />
            <Stat label="Olahraga" value={`${stats.exerciseSessions}x`} tone="default" />
            <Stat
              label="Mood rata2"
              value={stats.avgMood ? `${stats.avgMood}/5` : "-"}
              tone="default"
            />
          </div>
        </Card>

        <Card spec={{ Icon: Mail, tint: "var(--accent)" }} title="Moments">
          <Big>{stats.momentsCount}</Big>
          <Sub>kenangan tertulis tahun ini</Sub>
        </Card>

        <p className="pt-4 text-center text-[12px] text-text-3">
          Twogether · Wrapped {YEAR}
        </p>
      </div>
    </div>
  );
}

function Card({
  spec,
  title,
  children,
}: {
  spec: IconSpec;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <IconTile spec={spec} size={26} radius={8} />
        <h2 className="text-[12px] font-semibold section-label text-text-3">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return (
    <div className="tabular-nums text-[24px] font-bold leading-tight text-text-1">
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-0.5 text-[12px] text-text-3">{children}</div>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "default";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-positive-bg text-[color:var(--positive)]"
      : tone === "rose"
        ? "bg-negative-bg text-[color:var(--negative)]"
        : "bg-bg-elev1 text-text-1";
  return (
    <div className={`rounded-lg p-2 text-center ${toneClass}`}>
      <div className="text-[12px] font-semibold opacity-90">
        {label}
      </div>
      <div className="mt-0.5 tabular-nums text-[12px] font-bold">{value}</div>
    </div>
  );
}

/** Story-sized picture of the year to post or send (no money in it). */
function ShareCard({ activeDays, moments }: { activeDays: number; moments: number }) {
  const userId = useAuth((s) => s.userId);
  const annivs = useItems(userId, "anniv") ?? [];
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const start = relationshipStart(annivs);
  const names = partner ? `${nick(me)} & ${nick(partner)}` : nick(me);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);

  const together = start ? daysTogether(start) : null;
  useEffect(() => {
    let url = "";
    let alive = true;
    void drawWrappedCard({ year: YEAR, names, daysTogether: together, moments, activeDays, habitsDone: 0 }).then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setPreview({ url, blob });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [names, together, moments, activeDays]);

  async function share() {
    if (!preview) return;
    setBusy(true);
    try {
      await saveFile(preview.blob, `twogether-wrapped-${YEAR}.png`, "image/png");
      hapticSuccess();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface flex items-center gap-4 p-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- local canvas output
        <img src={preview.url} alt="Gambar Wrapped" width={72} height={128} className="h-32 w-[72px] shrink-0 rounded-xl object-cover shadow-card" />
      ) : (
        <div className="skeleton h-32 w-[72px] shrink-0 rounded-xl" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-text-1">Bagikan tahun kalian</div>
        <div className="mt-0.5 text-[12px] text-text-3">Gambar ukuran story, tanpa angka uang.</div>
        <button
          type="button"
          onClick={share}
          disabled={!preview || busy}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg active:scale-95 disabled:opacity-50"
        >
          <Share2 size={15} aria-hidden="true" />
          Bagikan
        </button>
      </div>
    </div>
  );
}
