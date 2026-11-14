"use client";

import { IconTile, spaceIcon } from "@/lib/icons";
import { Plus } from "lucide-react";
import { useNick } from "@/lib/nick";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/shell/AppHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { useAuth } from "@/stores/auth";
import { usePeople } from "@/lib/people";
import { useFeatures } from "@/stores/features";
import { FEATURES } from "@/data/features";
import { BackupNudge } from "@/components/widgets/BackupNudge";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { sync } from "@/services/sync";
import { TimeOfDayIcon, dayPart, type DayPart } from "@/components/shell/TimeOfDayIcon";

export default function HomePage() {
  const authName = useAuth((s) => s.name);
  const { me } = usePeople();
  const { nick } = useNick();
  const custom = nick(me);
  const name = custom && custom !== me ? custom : authName;
  const [editing, setEditing] = useState(false);
  const [greeting, setGreeting] = useState("Halo");
  const [today, setToday] = useState("");
  const [part, setPart] = useState<DayPart | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setPart(dayPart(h));
    const n = !name ? "" : name === custom ? name : name.split(" ")[0];
    const hi = (word: string) => (n ? `${word}, ${n}` : word);
    setGreeting(
      h < 4
        ? n
          ? hi("Malam")
          : "Belum tidur?"
        : h < 11
          ? hi("Pagi")
          : h < 15
            ? hi("Siang")
            : h < 18
              ? hi("Sore")
              : hi("Malam"),
    );
    setToday(
      now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
    );
  }, [name, custom]);

  const refresh = useCallback(() => sync.refresh(), []);

  return (
    <PullToRefresh onRefresh={refresh} disabled={editing}>
      <AppHeader
        eyebrow={today}
        title={greeting}
        titleIcon={part && <TimeOfDayIcon key={part} part={part} />}
        actions={
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`min-h-[44px] rounded-full px-3.5 text-xs font-semibold transition-colors ${
              editing ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-2"
            }`}
            aria-pressed={editing}
          >
            {editing ? "Selesai" : "Susun"}
          </button>
        }
      />
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-2.5 text-[13px] text-text-2"
          >
            <span>Geser kartu, ketuk − untuk sembunyikan</span>
            <Link
              href="/settings/dashboard"
              className="inline-flex min-h-[44px] shrink-0 items-center font-semibold text-accent"
            >
              + Kartu lain
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      {!editing && <BackupNudge />}
      <DashboardGrid editing={editing} />
      {!editing && <ToolsRow />}
    </PullToRefresh>
  );
}

// The couple's own spaces (picked in Jelajah) — nothing they don't use.
function ToolsRow() {
  const enabled = useFeatures((st) => st.enabled);
  const reduce = useReducedMotion();
  const spaces = enabled
    .map((href) => FEATURES.find((f) => f.href === href))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f))
    .slice(0, 7);
  return (
    <section className="mt-6 px-5 pb-6 md:px-8">
      <div className="mb-3 text-[16px] font-extrabold tracking-tight text-text-1">
        Ruang kalian
      </div>
      <div className="grid grid-cols-4 gap-y-4 md:grid-cols-6 lg:grid-cols-8">
        {spaces.map((f, i) => (
          <motion.div
            key={f.href}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={
              reduce
                ? { duration: 0.04 }
                : { duration: 0.28, delay: Math.min(i, 7) * 0.03, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <Link
              href={f.href}
              className="pressable flex flex-col items-center gap-1.5"
            >
              <IconTile spec={spaceIcon(f.href)} size={56} radius={18} />
              <span className="max-w-[72px] truncate text-[12px] font-medium text-text-2">
                {f.title}
              </span>
            </Link>
          </motion.div>
        ))}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={reduce ? { duration: 0.04 } : { duration: 0.28, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/fitur" className="pressable flex flex-col items-center gap-1.5">
            <span aria-hidden="true" className="grid h-[56px] w-[56px] place-items-center rounded-[18px] bg-bg-elev2 text-text-3">
              <Plus size={22} />
            </span>
            <span className="text-[12px] font-medium text-text-3">Tambah</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
