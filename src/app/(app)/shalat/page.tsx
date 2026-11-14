"use client";

import { AnimatePresence } from "framer-motion";
import { Check, CloudSun, Compass, HandHeart, MapPin, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { IconTile } from "@/lib/icons";
import { useNick } from "@/lib/nick";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { useIbadahPrefs } from "@/stores/ibadah";
import { toHijri } from "@/lib/hijri";
import { useShalatPrefs } from "@/stores/shalat";
import { deleteEntry, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { CITIES } from "@/data/cities";
import { PRAYERS, fmtTime, nextPrayer, prayerTimes, qiblaBearing, type PrayerId } from "@/lib/prayer";
import { usePeople, parsePayload, isoDay, addDays } from "@/lib/people";
import { computeCycle, isPeriodDay, DEFAULT_CYCLE_SETTINGS, type CycleSettings } from "@/lib/cycle";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

const PRAYER_ICON = {
  subuh: { Icon: Sunrise, tint: "var(--tint-amber)" },
  dzuhur: { Icon: Sun, tint: "var(--tint-yellow)" },
  ashar: { Icon: CloudSun, tint: "var(--tint-orange)" },
  maghrib: { Icon: Sunset, tint: "var(--tint-crimson)" },
  isya: { Icon: Moon, tint: "var(--tint-indigo)" },
} as const;

export default function ShalatPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const place = useShalatPrefs();
  const hijriOffset = useIbadahPrefs((s) => s.hijriOffset);
  const logs = useEntries(userId, "shalat") ?? [];
  const cycle = useEntries(userId, "cycle") ?? [];
  const cycleSettings = useItems(userId, "cycle-settings") ?? [];
  const qadhaItems = useItems(userId, "qadha") ?? [];
  const [now, setNow] = useState(() => new Date());
  const [showPlace, setShowPlace] = useState(false);
  const [showQibla, setShowQibla] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = isoDay(now);
  const times = useMemo(() => prayerTimes(place.lat, place.lng, now), [place.lat, place.lng, now]);
  const next = useMemo(() => nextPrayer(place.lat, place.lng, now), [place.lat, place.lng, now]);
  const minsLeft = Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60000));

  // Haid -> shalat is "libur", never counted as missed.
  const cycleFor = (who: string) => {
    const s = parsePayload<CycleSettings>(
      cycleSettings.find((i) => (i.who || me) === who)?.payload,
      DEFAULT_CYCLE_SETTINGS,
    );
    return computeCycle(cycle.filter((e) => (e.who || me) === who), s, today);
  };
  const onPeriodFor = (who: string) => cycleFor(who).onPeriod;
  const myCycle = cycleFor(me);
  const myLibur = myCycle.onPeriod;

  const doneOn = (who: string, day: string) =>
    logs.filter((l) => l.date === day && (l.who || me) === who);
  const mine = doneOn(me, today);

  async function toggle(id: PrayerId) {
    if (!userId) return;
    const existing = mine.find((l) => l.valueText === id);
    if (existing) {
      await deleteEntry(userId, existing.id);
    } else {
      await upsertEntry(userId, { kind: "shalat", date: today, valueText: id, who: me });
      hapticSuccess();
    }
  }
  async function toggleJamaah(id: PrayerId) {
    if (!userId) return;
    const existing = mine.find((l) => l.valueText === id);
    if (!existing) return;
    const p = parsePayload(existing.payload, { jamaah: false });
    await upsertEntry(userId, { ...existing, payload: JSON.stringify({ jamaah: !p.jamaah }) });
    hapticTap();
  }

  // Streak: consecutive full days (5/5) — haid days keep the streak alive.
  const streak = useMemo(() => {
    let n = 0;
    let day = doneOn(me, today).length === 5 ? today : addDays(today, -1);
    for (let i = 0; i < 400; i += 1) {
      const full = doneOn(me, day).length >= 5;
      if (!full && !isPeriodDay(myCycle, day)) break;
      if (full) n += 1;
      day = addDays(day, -1);
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, cycle, today]);

  const qadha = qadhaItems.find((i) => (i.who || me) === me);
  async function setQadha(n: number) {
    if (!userId) return;
    await upsertItem(userId, {
      id: qadha?.id,
      kind: "qadha",
      title: "Hutang puasa",
      who: me,
      amount: Math.max(0, n),
    });
    hapticTap();
  }

  return (
    <div>
      <AppHeader title="Shalat" />
      <div className="space-y-4 px-5 pb-8 pt-3">
        {/* Next prayer hero */}
        <div
          className="hero-soft relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
          style={{ ["--hero" as string]: "var(--tint-pine)" }}
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setShowPlace(true)}
              className="min-h-[44px] rounded-full bg-white/20 px-3.5 py-2 text-[12px] font-semibold"
            >
              {place.label} ›
            </button>
            <Link
              href="/hijriah"
              className="inline-flex min-h-[44px] items-center rounded-full bg-white/20 px-3.5 py-2 text-[12px] font-semibold"
            >
              {toHijri(today, hijriOffset).label}
            </Link>
          </div>
          <div className="mt-3 text-[13px] font-semibold text-white/85">Berikutnya</div>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-extrabold leading-none">{next.name}</span>
            <span className="text-[22px] font-bold tabular-nums">{fmtTime(next.at)}</span>
          </div>
          <div className="mt-1 text-[13px] text-white/85">
            {minsLeft >= 60
              ? `${Math.floor(minsLeft / 60)} jam ${minsLeft % 60} menit lagi`
              : `${minsLeft} menit lagi`}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="inline-flex min-h-[44px] items-center rounded-full bg-white/20 px-3.5 font-semibold">
              {streak} hari lengkap
            </span>
            <button
              type="button"
              onClick={() => setShowQibla(true)}
              className="min-h-[44px] rounded-full bg-white/20 px-3.5 font-semibold"
            >
              Arah kiblat
            </button>
          </div>
        </div>

        {myLibur && (
          <div className="rounded-[20px] bg-bg-elev1 px-4 py-3 text-[13px] text-text-2">
            Sedang haid, shalat libur dulu dan tidak dihitung bolong.
          </div>
        )}

        {/* Today's list */}
        <div className="divide-y divide-border overflow-hidden rounded-[20px] bg-bg-card shadow-card">
          {PRAYERS.map((p) => {
            const log = mine.find((l) => l.valueText === p.id);
            const done = !!log;
            const jamaah = parsePayload(log?.payload, { jamaah: false }).jamaah;
            const isNext = next.id === p.id && next.at.toDateString() === now.toDateString();
            const passed = times[p.id] <= now;
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${isNext ? "bg-bg-elev1" : ""}`}>
                <IconTile spec={PRAYER_ICON[p.id]} size={40} radius={12} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-text-1">{p.name}</div>
                  <div className="text-[12px] tabular-nums text-text-3">
                    {fmtTime(times[p.id])}
                    {isNext && " · berikutnya"}
                  </div>
                </div>
                {done && !myLibur && (
                  <button
                    type="button"
                    onClick={() => toggleJamaah(p.id)}
                    className={`min-h-[44px] rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                      jamaah ? "bg-text-1 text-bg-app" : "bg-bg-elev2 text-text-3"
                    }`}
                  >
                    {jamaah ? "Berjamaah" : "Berjamaah?"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={myLibur}
                  onClick={() => toggle(p.id)}
                  aria-label={done ? `Batalkan ${p.name}` : `Tandai ${p.name} sudah`}
                  className={`grid h-11 w-11 place-items-center rounded-full text-[16px] font-bold transition-transform active:scale-90 ${
                    myLibur
                      ? "bg-bg-elev2 text-text-4"
                      : done
                        ? "bg-accent text-accent-fg"
                        : passed
                          ? "border-2 border-border-strong text-transparent"
                          : "border-2 border-border text-transparent"
                  }`}
                >
                  {myLibur ? "-" : <Check size={18} strokeWidth={3} aria-hidden="true" />}
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-4 py-2.5 text-[12px] text-text-4">
            <span>Terbit {fmtTime(times.terbit)}</span>
            <span>Perkiraan, bisa beda 1-2 menit dengan masjid</span>
          </div>
        </div>

        {/* Partner progress */}
        {partner && (
          <div className="surface flex items-center gap-3 p-4">
            <IconTile spec={{ Icon: HandHeart, tint: "" }} size={40} radius={12} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-text-1">{nick(partner)} hari ini</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {onPeriodFor(partner) ? (
                  <span className="text-[12px] text-text-3">Sedang libur</span>
                ) : (
                  PRAYERS.map((p) => {
                    const ok = doneOn(partner, today).some((l) => l.valueText === p.id);
                    return (
                      <span
                        key={p.id}
                        title={p.name}
                        className={`grid h-7 min-w-[34px] place-items-center rounded-full px-2 text-[12px] font-bold ${
                          ok ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-4"
                        }`}
                      >
                        {p.name.slice(0, 3)}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Qadha */}
        <div className="surface flex items-center gap-3 p-4">
          <IconTile spec={{ Icon: Moon, tint: "" }} size={40} radius={12} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-text-1">Hutang puasa</div>
            <div className="text-[12px] text-text-3">
              {(qadha?.amount ?? 0) === 0 ? "Tidak ada hutang puasa" : "Hari yang perlu diganti"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setQadha((qadha?.amount ?? 0) - 1)}
            className="grid h-11 w-11 place-items-center rounded-full bg-bg-elev2 text-[18px] font-bold text-text-2 transition-transform active:scale-90"
            aria-label="Kurangi (sudah diganti)"
          >
            -
          </button>
          <span className="w-8 text-center text-[20px] font-extrabold tabular-nums text-text-1">
            {qadha?.amount ?? 0}
          </span>
          <button
            type="button"
            onClick={() => setQadha((qadha?.amount ?? 0) + 1)}
            className="grid h-11 w-11 place-items-center rounded-full bg-bg-elev2 text-[18px] font-bold text-text-2 transition-transform active:scale-90"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPlace && <PlaceSheet key="shalat-place" onClose={() => setShowPlace(false)} />}
        {showQibla && (
          <QiblaSheet key="shalat-qibla" lat={place.lat} lng={place.lng} onClose={() => setShowQibla(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaceSheet({ onClose }: { onClose: () => void }) {
  const setPlaceRaw = useShalatPrefs((s) => s.setPlace);
  // Keep the adzan push location in step with the chosen place.
  const setPlace: typeof setPlaceRaw = (p) => {
    setPlaceRaw(p);
    try {
      if (localStorage.getItem("twogether:push-adzan") === "1") {
        void import("@/lib/push").then((m) => m.updatePushPrefs(true)).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  };
  const current = useShalatPrefs((s) => s.label);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function useGps() {
    if (!navigator.geolocation) {
      setMsg("Lokasi tidak tersedia di perangkat ini.");
      return;
    }
    setMsg("Mencari lokasi…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace({
          label: "Lokasiku",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "gps",
        });
        onClose();
      },
      () => setMsg("Izin lokasi ditolak. Pilih kota di bawah saja."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600_000 },
    );
  }

  const list = CITIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet title="Lokasi jadwal shalat" onClose={onClose}>
      <button
        type="button"
        onClick={useGps}
        className="mb-2 flex min-h-[44px] w-full items-center gap-3 rounded-2xl bg-bg-card p-3.5 text-left shadow-card active:scale-[0.99]"
      >
        <MapPin size={20} className="shrink-0 text-text-3" aria-hidden="true" />
        <span>
          <span className="block text-[14px] font-semibold text-text-1">Pakai lokasi HP</span>
          <span className="block text-[12px] text-text-3">Lebih akurat · hanya disimpan di HP ini</span>
        </span>
      </button>
      {msg && <p className="mb-2 text-[12px] text-text-3">{msg}</p>}
      <label htmlFor="shalat-city-search" className="sr-only">
        Cari kota
      </label>
      <input
        id="shalat-city-search"
        className="input-base mb-2"
        placeholder="Cari kota…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-bg-card shadow-card">
        {list.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => {
              setPlace({ label: c.name, lat: c.lat, lng: c.lng, source: "city" });
              onClose();
            }}
            className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-[14px] text-text-1 active:bg-bg-elev1"
          >
            {c.name}
            {current === c.name && <Check size={16} className="text-accent" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function QiblaSheet({ lat, lng, onClose }: { lat: number; lng: number; onClose: () => void }) {
  const bearing = qiblaBearing(lat, lng);
  const [heading, setHeading] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const listener = useRef<EventListener | null>(null);
  const eventName = useRef("deviceorientation");
  useEffect(
    () => () => {
      if (listener.current) window.removeEventListener(eventName.current, listener.current, true);
    },
    [],
  );

  async function startCompass() {
    type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    const DO = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : null) as DOE | null;
    if (!DO) {
      setMsg("Kompas tidak tersedia di perangkat ini.");
      return;
    }
    if (DO.requestPermission) {
      const r = await DO.requestPermission().catch(() => "denied");
      if (r !== "granted") {
        setMsg("Izin kompas ditolak.");
        return;
      }
    }
    const onOrient = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
      if (h != null) setHeading(h);
    };
    // Android: plain `deviceorientation` alpha is relative to wherever the
    // phone pointed at start; the absolute event is relative to north.
    // iOS has no absolute event and uses webkitCompassHeading instead.
    eventName.current = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    listener.current = onOrient as EventListener;
    window.addEventListener(eventName.current, listener.current, true);
    setMsg("Pegang HP mendatar, putar sampai panah menunjuk ke atas.");
  }

  const rotation = heading == null ? bearing : bearing - heading;
  const aligned = heading != null && Math.abs(((rotation % 360) + 540) % 360 - 180) < 5;

  return (
    <Sheet title="Arah kiblat" onClose={onClose}>
      <div className="flex flex-col items-center py-2">
        <div
          className={`relative grid h-56 w-56 place-items-center rounded-full border-4 ${
            aligned ? "border-accent" : "border-border"
          } bg-bg-card shadow-card`}
        >
          <span className="absolute top-2 text-[12px] font-bold text-text-3">U</span>
          <div
            className="flex h-full w-full items-start justify-center transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="mt-6 flex flex-col items-center gap-1">
              <Compass size={26} className="text-accent" aria-hidden="true" />
              <span className="h-20 w-1.5 rounded-full bg-accent" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-[15px] font-bold text-text-1">
          {Math.round(bearing)}° dari utara
        </div>
        {heading == null ? (
          <button type="button" onClick={startCompass} className="btn-accent mt-4 px-6">
            Pakai kompas HP
          </button>
        ) : aligned ? (
          <p className="mt-2 text-[14px] font-semibold text-accent">Sudah menghadap kiblat</p>
        ) : null}
        {msg && <p className="mt-3 text-center text-[12px] text-text-3">{msg}</p>}
      </div>
    </Sheet>
  );
}
