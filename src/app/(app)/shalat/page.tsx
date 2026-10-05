"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { useShalatPrefs } from "@/stores/shalat";
import { deleteEntry, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { CITIES } from "@/data/cities";
import { PRAYERS, fmtTime, nextPrayer, prayerTimes, qiblaBearing, type PrayerId } from "@/lib/prayer";
import { usePeople, parsePayload, isoDay, addDays } from "@/lib/people";
import { computeCycle, isPeriodDay, DEFAULT_CYCLE_SETTINGS, type CycleSettings } from "@/lib/cycle";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

export default function ShalatPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const place = useShalatPrefs();
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

  // Haid → shalat is "libur", never counted as missed.
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
          className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
          style={{ background: "linear-gradient(135deg,#0f7a5c 0%,#1fae84 60%,#d9b24c 140%)" }}
        >
          <span aria-hidden className="absolute -right-3 -top-4 text-[90px] opacity-15">🕌</span>
          <button
            onClick={() => setShowPlace(true)}
            className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold backdrop-blur"
          >
            📍 {place.label} ›
          </button>
          <div className="mt-3 text-[13px] font-semibold text-white/85">Berikutnya</div>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-extrabold leading-none">{next.name}</span>
            <span className="font-mono text-[22px] font-bold">{fmtTime(next.at)}</span>
          </div>
          <div className="mt-1 text-[13px] text-white/85">
            {minsLeft >= 60
              ? `${Math.floor(minsLeft / 60)} jam ${minsLeft % 60} menit lagi`
              : `${minsLeft} menit lagi`}
          </div>
          <div className="mt-4 flex gap-2 text-[12px]">
            <span className="rounded-full bg-white/20 px-3 py-1 font-semibold">
              🔥 {streak} hari lengkap
            </span>
            <button
              onClick={() => setShowQibla(true)}
              className="rounded-full bg-white/20 px-3 py-1 font-semibold"
            >
              🧭 Arah kiblat
            </button>
          </div>
        </div>

        {myLibur && (
          <div className="rounded-[20px] bg-accent-soft px-4 py-3 text-[13px] text-text-2">
            🌸 Sedang haid — shalat libur dulu dan tidak dihitung bolong. Istirahat ya.
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
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${isNext ? "bg-[#1fae84]/10" : ""}`}>
                <span className="text-[22px]">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-text-1">{p.name}</div>
                  <div className="font-mono text-[12px] text-text-3">
                    {fmtTime(times[p.id])}
                    {isNext && " · berikutnya"}
                  </div>
                </div>
                {done && !myLibur && (
                  <button
                    onClick={() => toggleJamaah(p.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      jamaah ? "bg-[#1fae84] text-white" : "bg-bg-elev2 text-text-3"
                    }`}
                  >
                    {jamaah ? "Berjamaah ✓" : "Berjamaah?"}
                  </button>
                )}
                <button
                  disabled={myLibur}
                  onClick={() => toggle(p.id)}
                  aria-label={done ? `Batalkan ${p.name}` : `Tandai ${p.name} sudah`}
                  className={`grid h-9 w-9 place-items-center rounded-full text-[16px] font-bold transition-all active:scale-90 ${
                    myLibur
                      ? "bg-bg-elev2 text-text-4"
                      : done
                        ? "bg-[#1fae84] text-white shadow-[0_6px_14px_-8px_#1fae84]"
                        : passed
                          ? "border-2 border-[#1fae84]/50 text-transparent"
                          : "border-2 border-border text-transparent"
                  }`}
                >
                  {myLibur ? "–" : "✓"}
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-4 py-2.5 text-[12px] text-text-4">
            <span>Terbit {fmtTime(times.terbit)}</span>
            <span>Perkiraan, bisa beda 1–2 menit dengan masjid</span>
          </div>
        </div>

        {/* Partner progress */}
        {partner && (
          <div className="surface flex items-center gap-3 p-4">
            <span className="text-[22px]">🤝</span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-text-1">{partner} hari ini</div>
              <div className="mt-1.5 flex gap-1.5">
                {onPeriodFor(partner) ? (
                  <span className="text-[12px] text-text-3">🌸 Sedang libur</span>
                ) : (
                  PRAYERS.map((p) => {
                    const ok = doneOn(partner, today).some((l) => l.valueText === p.id);
                    return (
                      <span
                        key={p.id}
                        title={p.name}
                        className={`grid h-7 min-w-[28px] place-items-center rounded-full px-1.5 text-[10px] font-bold ${
                          ok ? "bg-[#1fae84] text-white" : "bg-bg-elev2 text-text-4"
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
          <span className="text-[22px]">🌙</span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-text-1">Hutang puasa</div>
            <div className="text-[12px] text-text-3">
              {(qadha?.amount ?? 0) === 0 ? "Tidak ada hutang puasa" : "Hari yang perlu diganti"}
            </div>
          </div>
          <button
            onClick={() => setQadha((qadha?.amount ?? 0) - 1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-bg-elev2 text-[18px] font-bold text-text-2 active:scale-90"
            aria-label="Kurangi (sudah diganti)"
          >
            −
          </button>
          <span className="w-8 text-center font-mono text-[20px] font-extrabold text-text-1">
            {qadha?.amount ?? 0}
          </span>
          <button
            onClick={() => setQadha((qadha?.amount ?? 0) + 1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-bg-elev2 text-[18px] font-bold text-text-2 active:scale-90"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
      </div>

      {showPlace && <PlaceSheet onClose={() => setShowPlace(false)} />}
      {showQibla && (
        <QiblaSheet lat={place.lat} lng={place.lng} onClose={() => setShowQibla(false)} />
      )}
    </div>
  );
}

function PlaceSheet({ onClose }: { onClose: () => void }) {
  const setPlace = useShalatPrefs((s) => s.setPlace);
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
        onClick={useGps}
        className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-bg-card p-3.5 text-left shadow-card active:scale-[0.99]"
      >
        <span className="text-[20px]">📍</span>
        <span>
          <span className="block text-[14px] font-semibold text-text-1">Pakai lokasi HP</span>
          <span className="block text-[12px] text-text-3">Lebih akurat · hanya disimpan di HP ini</span>
        </span>
      </button>
      {msg && <p className="mb-2 text-[12px] text-text-3">{msg}</p>}
      <input
        className="input-base mb-2"
        placeholder="Cari kota…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-bg-card shadow-card">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setPlace({ label: c.name, lat: c.lat, lng: c.lng, source: "city" });
              onClose();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] text-text-1 active:bg-bg-elev1"
          >
            {c.name}
            {current === c.name && <span className="text-accent">✓</span>}
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
  useEffect(
    () => () => {
      if (listener.current) window.removeEventListener("deviceorientation", listener.current, true);
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
    listener.current = onOrient as EventListener;
    window.addEventListener("deviceorientation", listener.current, true);
    setMsg("Pegang HP mendatar, putar sampai panah menunjuk ke atas.");
  }

  const rotation = heading == null ? bearing : bearing - heading;
  const aligned = heading != null && Math.abs(((rotation % 360) + 540) % 360 - 180) < 5;

  return (
    <Sheet title="Arah kiblat" onClose={onClose}>
      <div className="flex flex-col items-center py-2">
        <div
          className={`relative grid h-56 w-56 place-items-center rounded-full border-4 ${
            aligned ? "border-[#1fae84]" : "border-border"
          } bg-bg-card shadow-card`}
        >
          <span className="absolute top-2 text-[12px] font-bold text-text-3">U</span>
          <div
            className="flex h-full w-full items-start justify-center transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="mt-6 flex flex-col items-center">
              <span className="text-[30px]">🕋</span>
              <span className="h-20 w-1.5 rounded-full bg-[#1fae84]" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-[15px] font-bold text-text-1">
          {Math.round(bearing)}° dari utara
        </div>
        {heading == null ? (
          <button onClick={startCompass} className="btn-accent mt-4 px-6">
            Pakai kompas HP
          </button>
        ) : aligned ? (
          <p className="mt-2 text-[14px] font-semibold text-[#1fae84]">Sudah menghadap kiblat ✓</p>
        ) : null}
        {msg && <p className="mt-3 text-center text-[12px] text-text-3">{msg}</p>}
      </div>
    </Sheet>
  );
}
