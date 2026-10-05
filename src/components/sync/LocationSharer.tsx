"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/stores/auth";
import { useLocationShare, type LivePayload } from "@/stores/locationShare";
import { upsertItem } from "@/stores/data";
import { getDB } from "@/lib/db";
import { usePeople } from "@/lib/people";

/**
 * While "Bagikan lokasi" is on, posts this phone's position (at most once a
 * minute) so the partner can see it on Peta. Web apps can only do this
 * while the app is open; it switches itself off when the time is up.
 */
export function LocationSharer() {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const until = useLocationShare((s) => s.until);
  const stop = useLocationShare((s) => s.stop);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!userId || !until) return;
    if (!("geolocation" in navigator)) return;

    async function write(p: Partial<LivePayload> & { off?: boolean }) {
      if (!userId) return;
      const db = getDB();
      const existing = (await db.items.where("[userId+kind]").equals([userId, "live-location"]).toArray()).find(
        (i) => i.who === me && !i.deletedAt,
      );
      await upsertItem(userId, {
        id: existing?.id,
        kind: "live-location",
        title: `Lokasi ${me}`,
        who: me,
        status: p.off ? "off" : "on",
        payload: JSON.stringify(p.off ? { ...JSON.parse(existing?.payload ?? "{}"), until: Date.now() } : p),
      });
    }

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (until && now > until) return;
        if (now - lastSent.current < 55_000) return;
        lastSent.current = now;
        void write({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: Math.round(pos.coords.accuracy),
          at: now,
          until: until!,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    const timer = setInterval(() => {
      if (until && Date.now() > until) {
        stop();
        void write({ off: true });
      }
    }, 15_000);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
    };
  }, [userId, until, me, stop]);

  // Turned off by the user → tell the partner right away.
  const prev = useRef(until);
  useEffect(() => {
    if (prev.current && !until && userId) {
      void (async () => {
        const db = getDB();
        const existing = (await db.items.where("[userId+kind]").equals([userId, "live-location"]).toArray()).find(
          (i) => i.who === me && !i.deletedAt,
        );
        if (existing) await upsertItem(userId, { ...existing, status: "off" });
      })();
    }
    prev.current = until;
  }, [until, userId, me]);

  return null;
}
