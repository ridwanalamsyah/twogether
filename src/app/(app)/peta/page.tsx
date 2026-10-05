"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, Field } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import type { LeafletMapHandle, MapMarker } from "@/components/map/LeafletMap";
import { useAuth } from "@/stores/auth";
import { deleteItem, upsertItem, useItems } from "@/stores/data";
import { useLocationShare, type LivePayload } from "@/stores/locationShare";
import { usePeople, parsePayload, fromIsoDay } from "@/lib/people";
import { todayISO } from "@/lib/utils";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import type { ItemRecord } from "@/lib/db";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-bg-elev2" />,
});

interface PlacePayload {
  lat: number;
  lng: number;
  emoji: string;
  note: string;
}

const PLACE_EMOJIS = ["❤️", "☕", "🍜", "🎬", "🏖️", "⛰️", "🎡", "🕌", "🏠", "🎓", "💍", "📸"];

export default function PetaPage() {
  const [tab, setTab] = useState<"kenangan" | "lokasi">("kenangan");
  return (
    <div>
      <AppHeader title="Peta" />
      <div className="px-5 pt-3">
        <div className="relative grid grid-cols-2 rounded-[12px] bg-bg-elev2 p-1 text-[14px]">
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[9px] bg-bg-card shadow-sm transition-transform duration-300 ease-ios"
            style={{ transform: tab === "kenangan" ? "none" : "translateX(100%)" }}
          />
          {(["kenangan", "lokasi"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative py-2 font-semibold ${tab === t ? "text-text-1" : "text-text-3"}`}
            >
              {t === "kenangan" ? "📍 Kenangan" : "🛰️ Lokasi"}
            </button>
          ))}
        </div>
      </div>
      {tab === "kenangan" ? <Kenangan /> : <Lokasi />}
    </div>
  );
}

/* ───────────── Kenangan: pins of places you've been together ───────────── */

function Kenangan() {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const places = useItems(userId, "place") ?? [];
  const map = useRef<LeafletMapHandle>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number; item?: ItemRecord } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = [...places].sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));
  const markers: MapMarker[] = places.map((p) => {
    const d = parsePayload<PlacePayload>(p.payload, { lat: 0, lng: 0, emoji: "❤️", note: "" });
    return { id: p.id, lat: d.lat, lng: d.lng, label: d.emoji, title: p.title };
  });

  function here() {
    if (!navigator.geolocation) return setMsg("Lokasi tidak tersedia di perangkat ini.");
    setMsg("Mencari lokasi…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMsg(null);
        setDraft({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setMsg("Izin lokasi ditolak. Tap peta untuk menaruh pin."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="px-5 pb-10 pt-3">
      <div className="relative isolate h-[48vh] min-h-[280px] overflow-hidden rounded-[24px] shadow-card md:h-[56vh]">
        <LeafletMap
          ref={map}
          markers={markers}
          className="h-full w-full"
          onMarkerClick={(id) => {
            const it = places.find((p) => p.id === id);
            if (!it) return;
            const d = parsePayload<PlacePayload>(it.payload, { lat: 0, lng: 0, emoji: "❤️", note: "" });
            setDraft({ lat: d.lat, lng: d.lng, item: it });
          }}
          onMapClick={(lat, lng) => {
            if (!picking) return;
            setPicking(false);
            setDraft({ lat, lng });
          }}
        />
        {picking && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-text-1 px-4 py-2 text-[13px] font-semibold text-bg-app shadow-float">
            Tap di peta untuk menaruh pin
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={here} className="btn-accent flex-1 py-2.5 text-[14px]">
          📍 Tandai di sini
        </button>
        <button
          onClick={() => {
            setPicking((v) => !v);
            hapticTap();
          }}
          className={`flex-1 rounded-full py-2.5 text-[14px] font-semibold ${picking ? "bg-text-1 text-bg-app" : "bg-bg-card text-text-2 shadow-card"}`}
        >
          {picking ? "Batal" : "Pilih di peta"}
        </button>
      </div>
      {msg && <p className="mt-2 text-center text-[12px] text-text-3">{msg}</p>}

      <div className="mt-6 mb-2 flex items-baseline justify-between">
        <span className="text-[16px] font-extrabold text-text-1">Tempat kalian</span>
        <span className="text-[13px] text-text-3">{places.length} tempat</span>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-[20px] border-2 border-dashed border-border px-6 py-8 text-center text-[13px] text-text-3">
          Tempat kencan pertama, kafe favorit, liburan… tandai semuanya di sini 💕
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
          {sorted.map((p) => {
            const d = parsePayload<PlacePayload>(p.payload, { lat: 0, lng: 0, emoji: "❤️", note: "" });
            return (
              <li key={p.id} className="border-b border-border last:border-0">
                <SwipeRow onDelete={() => userId && deleteItem(userId, p.id)}>
                  <button
                    onClick={() => map.current?.flyTo(d.lat, d.lng)}
                    className="flex w-full items-center gap-3 bg-bg-card px-4 py-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-[20px]">{d.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-text-1">{p.title}</span>
                      <span className="block truncate text-[12px] text-text-4">
                        {p.date ? fromIsoDay(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                        {d.note ? ` · ${d.note}` : ""}
                      </span>
                    </span>
                  </button>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}

      {draft && userId && (
        <PlaceSheet
          userId={userId}
          me={me}
          draft={draft}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function PlaceSheet({
  userId,
  me,
  draft,
  onClose,
}: {
  userId: string;
  me: string;
  draft: { lat: number; lng: number; item?: ItemRecord };
  onClose: () => void;
}) {
  const d = parsePayload<PlacePayload>(draft.item?.payload, { lat: draft.lat, lng: draft.lng, emoji: "❤️", note: "" });
  const [title, setTitle] = useState(draft.item?.title ?? "");
  const [date, setDate] = useState(draft.item?.date ?? todayISO());
  const [emoji, setEmoji] = useState(d.emoji);
  const [note, setNote] = useState(d.note);

  async function save() {
    if (!title.trim()) return;
    await upsertItem(userId, {
      id: draft.item?.id,
      kind: "place",
      title: title.trim(),
      date,
      who: draft.item?.who ?? me,
      payload: JSON.stringify({ lat: draft.lat, lng: draft.lng, emoji, note: note.trim() } satisfies PlacePayload),
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      title={draft.item ? draft.item.title : "Tempat baru"}
      onClose={onClose}
      footer={
        <button onClick={save} disabled={!title.trim()} className="btn-accent w-full disabled:opacity-50">
          Simpan
        </button>
      }
    >
      <Field label="Nama tempat">
        <input className="input-base" autoFocus placeholder="Kafe tempat pertama ketemu" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Ikon">
        <div className="flex flex-wrap gap-1.5">
          {PLACE_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji(em)}
              className={`grid h-10 w-10 place-items-center rounded-xl text-[20px] ${emoji === em ? "bg-accent-soft ring-2 ring-[color:var(--accent)]" : "bg-bg-card shadow-card"}`}
            >
              {em}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tanggal">
        <input type="date" className="input-base" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Cerita singkat">
        <textarea className="input-base h-20 py-2" placeholder="Opsional" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${draft.lat},${draft.lng}`}
        target="_blank"
        rel="noreferrer"
        className="text-[13px] font-semibold text-accent"
      >
        Buka di Google Maps ↗
      </a>
    </Sheet>
  );
}

/* ───────────── Lokasi: temporary live location sharing ───────────── */

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? "baru saja" : m < 60 ? `${m} menit lalu` : `${Math.floor(m / 60)} jam lalu`;
}

function Lokasi() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const live = useItems(userId, "live-location") ?? [];
  const until = useLocationShare((s) => s.until);
  const start = useLocationShare((s) => s.start);
  const stop = useLocationShare((s) => s.stop);
  const [, tick] = useState(0);
  const map = useRef<LeafletMapHandle>(null);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const active = (who: string) => {
    const it = live.find((i) => i.who === who && i.status === "on");
    if (!it) return null;
    const p = parsePayload<LivePayload>(it.payload, { lat: 0, lng: 0, acc: 0, at: 0, until: 0 });
    if (!p.at || p.until < now) return null;
    return p;
  };
  const mine = active(me);
  const theirs = partner ? active(partner) : null;
  const sharing = !!until && until > now;

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (mine) out.push({ id: "me", lat: mine.lat, lng: mine.lng, label: (me[0] ?? "A").toUpperCase(), color: "#3b82f6", live: true, title: "Kamu" });
    if (theirs && partner)
      out.push({ id: "partner", lat: theirs.lat, lng: theirs.lng, label: (partner[0] ?? "P").toUpperCase(), live: true, title: partner });
    return out;
  }, [mine, theirs, me, partner]);

  return (
    <div className="px-5 pb-10 pt-3">
      <div className="relative isolate h-[42vh] min-h-[260px] overflow-hidden rounded-[24px] shadow-card">
        <LeafletMap ref={map} markers={markers} className="h-full w-full" />
        {markers.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center bg-bg-card/60 px-8 text-center text-[13px] text-text-2">
            Belum ada yang sedang berbagi lokasi.
          </div>
        )}
      </div>

      {partner && (
        <div className="surface mt-3 flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-[15px] font-bold text-accent-fg">
            {(partner[0] ?? "P").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-text-1">{partner}</div>
            <div className="text-[12px] text-text-3">
              {theirs
                ? `Diperbarui ${ago(theirs.at)}${mine ? ` · ${distanceKm(mine, theirs).toFixed(1)} km dari kamu` : ""}`
                : "Sedang tidak berbagi lokasi"}
            </div>
          </div>
          {theirs && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${theirs.lat},${theirs.lng}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-bg-elev2 px-3 py-1.5 text-[12px] font-semibold text-text-2"
            >
              Rute ↗
            </a>
          )}
        </div>
      )}

      <div className="surface mt-3 p-4">
        <div className="text-[14px] font-bold text-text-1">Bagikan lokasimu</div>
        <p className="mt-0.5 text-[12px] text-text-3">
          {sharing
            ? `Sedang dibagikan sampai ${new Date(until!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}. Diperbarui selama app terbuka.`
            : `Cocok saat OTW — ${partner ?? "pasanganmu"} bisa lihat posisimu. Mati otomatis.`}
        </p>
        {sharing ? (
          <button onClick={stop} className="btn-danger mt-3 w-full">
            Berhenti berbagi
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              [15, "15 menit"],
              [60, "1 jam"],
              [240, "4 jam"],
            ].map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  start(m as number);
                  hapticSuccess();
                }}
                className="rounded-full bg-bg-elev2 py-2.5 text-[13px] font-semibold text-text-1 active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-text-4">
        Lokasi hanya dibagikan ke pasanganmu dan berhenti otomatis sesuai waktu yang dipilih.
      </p>
    </div>
  );
}
