"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HardDriveDownload, X } from "lucide-react";
import { lastBackupAt } from "@/services/privacy";

const FIRST_SEEN_KEY = "twogether:first-seen";
const SNOOZE_KEY = "twogether:backup-snooze";
const DUE_AFTER = 30 * 86_400_000;
const SNOOZE_FOR = 7 * 86_400_000;

/** Days since the last backup when one is due, else null. */
function backupDueDays(): number | null {
  try {
    const now = Date.now();
    if (Number(localStorage.getItem(SNOOZE_KEY)) > now) return null;
    let since = lastBackupAt();
    if (!since) {
      // Never backed up: count from the first time this phone opened Beranda.
      since = Number(localStorage.getItem(FIRST_SEEN_KEY)) || 0;
      if (!since) {
        localStorage.setItem(FIRST_SEEN_KEY, String(now));
        return null;
      }
    }
    return now - since > DUE_AFTER ? Math.floor((now - since) / 86_400_000) : null;
  } catch {
    return null;
  }
}

/** Gentle monthly reminder on Beranda to save a backup file. */
export function BackupNudge() {
  const [days, setDays] = useState<number | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => setDays(backupDueDays()), []);

  function snooze() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_FOR));
    } catch {
      /* ignore */
    }
    setDays(null);
  }

  return (
    <AnimatePresence>
      {days !== null && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-bg-elev1 py-2 pl-4 pr-2 md:mx-8"
        >
          <HardDriveDownload size={18} className="shrink-0 text-text-3" aria-hidden />
          <Link href="/settings/privacy" className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center py-1">
            <div className="text-[13px] font-semibold text-text-1">Simpan cadangan data</div>
            <div className="text-[12px] text-text-3">
              {lastBackupAt() ? `Terakhir ${days} hari lalu` : "Belum pernah"} · tap untuk backup
            </div>
          </Link>
          <button
            type="button"
            onClick={snooze}
            aria-label="Ingatkan minggu depan"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-4 active:opacity-60"
          >
            <X size={16} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
