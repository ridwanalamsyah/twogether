"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { useItems } from "@/stores/data";
import { useIbadahPrefs } from "@/stores/ibadah";
import { celebrationToday, relationshipStart } from "@/lib/anniv";
import { isoDay } from "@/lib/dates";
import { ramadhanRange } from "@/lib/hijri";
import type { WidgetKind } from "@/stores/dashboard";

/**
 * Beranda cards that matter right now and float to the top for a while,
 * without touching the saved order: "Sudah bersama" on the anniversary or a
 * round day, and Ramadhan in the afternoon run-up to buka puasa.
 */
export function useHotWidgets(): Set<WidgetKind> {
  const userId = useAuth((s) => s.userId);
  const annivs = useItems(userId, "anniv");
  const offset = useIbadahPrefs((s) => s.hijriOffset);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10 * 60_000);
    return () => clearInterval(t);
  }, []);

  const hot = new Set<WidgetKind>();
  const today = isoDay(now);
  if (celebrationToday(relationshipStart(annivs ?? []), today)) hot.add("hari-kita");
  const range = ramadhanRange(today, offset);
  const h = now.getHours();
  if (range && range.start <= today && today <= range.end && h >= 15 && h < 19) hot.add("ramadhan");
  return hot;
}
