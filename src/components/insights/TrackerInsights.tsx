"use client";

import { useMemo } from "react";
import { Activity, Droplets, Moon, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { useEntries } from "@/stores/data";

type InsightIcon = "water" | "sleep" | "trendDown" | "trendUp" | "exercise" | "focus";

interface InsightLine {
  icon: InsightIcon;
  text: string;
}

const ICON_MAP = {
  water: Droplets,
  sleep: Moon,
  trendDown: TrendingDown,
  trendUp: TrendingUp,
  exercise: Activity,
  focus: Timer,
} as const;

/**
 * Generates 3-5 simple, fact-based observations from the user's tracker
 * entries (water/mood/sleep/exercise/weight). Heuristic-only (no LLM).
 */
export function TrackerInsights() {
  const userId = useAuth((s) => s.userId);
  const water = useEntries(userId, "water") ?? [];
  const sleep = useEntries(userId, "sleep") ?? [];
  const mood = useEntries(userId, "mood") ?? [];
  const weight = useEntries(userId, "weight") ?? [];
  const exercise = useEntries(userId, "exercise") ?? [];
  const pomodoro = useEntries(userId, "pomodoro") ?? [];

  const insights = useMemo<InsightLine[]>(() => {
    const out: InsightLine[] = [];
    const today = new Date();
    const last7 = (date: string): boolean => {
      const d = new Date(date);
      const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    };

    // Air minum 7 hari
    const water7 = water.filter((e) => last7(e.date));
    if (water7.length > 0) {
      const total = water7.reduce((a, b) => a + (b.valueNum ?? 0), 0);
      const avg = total / 7;
      if (avg < 4) {
        out.push({
          icon: "water",
          text: `Rata-rata air minum minggu ini ${avg.toFixed(1)} gelas/hari, kurang dari target 8.`,
        });
      } else if (avg >= 7) {
        out.push({
          icon: "water",
          text: `Air minum konsisten, rata-rata ${avg.toFixed(1)} gelas/hari minggu ini.`,
        });
      }
    }

    // Tidur 7 hari
    const sleep7 = sleep.filter((e) => last7(e.date));
    if (sleep7.length > 0) {
      const avg =
        sleep7.reduce((a, b) => a + (b.valueNum ?? 0), 0) / sleep7.length;
      const lowDays = sleep7.filter((s) => (s.valueNum ?? 0) < 6).length;
      if (avg < 6.5) {
        out.push({
          icon: "sleep",
          text: `Rata-rata tidur ${avg.toFixed(1)} jam, ${lowDays} hari kurang dari 6 jam.`,
        });
      } else {
        out.push({
          icon: "sleep",
          text: `Tidur stabil, rata-rata ${avg.toFixed(1)} jam minggu ini.`,
        });
      }
    }

    // Mood pattern
    if (mood.length >= 3) {
      const dayBuckets: Record<number, number[]> = {};
      for (const m of mood) {
        const d = new Date(m.date).getDay();
        dayBuckets[d] = dayBuckets[d] ?? [];
        dayBuckets[d].push(m.valueNum ?? 3);
      }
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      let lowDay = -1;
      let lowAvg = 999;
      for (const k in dayBuckets) {
        const arr = dayBuckets[Number(k)];
        const a = arr.reduce((x, y) => x + y, 0) / arr.length;
        if (a < lowAvg) {
          lowAvg = a;
          lowDay = Number(k);
        }
      }
      if (lowDay >= 0 && lowAvg < 3) {
        out.push({
          icon: "trendDown",
          text: `Mood paling rendah hari ${dayNames[lowDay]} (rata-rata ${lowAvg.toFixed(1)}/5).`,
        });
      }
    }

    // Berat trend
    if (weight.length >= 2) {
      const sorted = [...weight].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0].valueNum ?? 0;
      const last = sorted[sorted.length - 1].valueNum ?? 0;
      const diff = last - first;
      if (Math.abs(diff) >= 0.3) {
        out.push({
          icon: diff > 0 ? "trendUp" : "trendDown",
          text: `Berat ${diff > 0 ? "naik" : "turun"} ${Math.abs(diff).toFixed(1)} kg sejak pencatatan pertama.`,
        });
      }
    }

    // Olahraga 7 hari
    const ex7 = exercise.filter((e) => last7(e.date));
    if (ex7.length > 0) {
      const total = ex7.reduce((a, b) => a + (b.valueNum ?? 0), 0);
      out.push({
        icon: "exercise",
        text: `${ex7.length}x olahraga, total ${total} menit minggu ini.`,
      });
    } else if (exercise.length > 0) {
      out.push({
        icon: "exercise",
        text: "Belum olahraga minggu ini. Mulai sesi singkat hari ini.",
      });
    }

    // Pomodoro fokus
    const pom7 = pomodoro.filter((e) => last7(e.date));
    if (pom7.length >= 3) {
      const total = pom7.reduce((a, b) => a + (b.valueNum ?? 0), 0);
      out.push({
        icon: "focus",
        text: `${pom7.length} sesi pomodoro (sekitar ${total} menit fokus) minggu ini.`,
      });
    }

    return out;
  }, [water, sleep, mood, weight, exercise, pomodoro]);

  if (insights.length === 0) return null;

  return (
    <section className="surface mt-3 px-4 py-3">
      <div className="mb-2 text-[12px] font-bold section-label text-text-3">
        Pola kebiasaan
      </div>
      <ul className="space-y-2">
        {insights.map((item, idx) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <li key={idx} className="flex items-start gap-2.5 text-[12px] text-text-2">
              <Icon size={16} strokeWidth={1.9} aria-hidden className="mt-0.5 shrink-0 text-text-3" />
              <span className="flex-1 leading-relaxed">{item.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
