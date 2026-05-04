"use client";

import { useEffect } from "react";
import { sync } from "@/services/sync";
import { applyRecurring, applyRecurringGoals } from "@/services/recurring";
import {
  scanUpcomingDeadlines,
  scheduleDailyReminders,
} from "@/services/notifications";
import { useAuth } from "@/stores/auth";
import { PWAInstaller } from "./PWAInstaller";

/** Boots the sync manager + service worker once the app mounts. */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuth((s) => s.userId);

  useEffect(() => {
    sync.start();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void applyRecurring(userId);
    void applyRecurringGoals(userId);
    void scanUpcomingDeadlines(userId);
    scheduleDailyReminders();
  }, [userId]);

  return (
    <>
      <PWAInstaller />
      {children}
    </>
  );
}
