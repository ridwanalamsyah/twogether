"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  useEffect(() => setDays(backupDueDays()), []);
  if (days === null) return null;

  function snooze() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_FOR));
    } catch {
      /* ignore */
    }
    setDays(null);
  }

  return (
    <div className="pop-in mx-5 mt-3 flex items-center gap-3 rounded-2xl bg-bg-elev1 px-4 py-3 md:mx-8">
      <HardDriveDownload size={18} className="shrink-0 text-text-3" />
      <Link href="/settings/privacy" className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text-1">Simpan cadangan data</div>
        <div className="text-[12px] text-text-3">
          {lastBackupAt() ? `Terakhir ${days} hari lalu` : "Belum pernah"} · tap untuk backup
        </div>
      </Link>
      <button onClick={snooze} aria-label="Ingatkan minggu depan" className="p-1 text-text-4">
        <X size={16} />
      </button>
    </div>
  );
}
