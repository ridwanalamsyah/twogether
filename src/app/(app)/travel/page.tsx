"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import {
  deleteTrip,
  upsertTrip,
  useTransactions,
  useTrips,
} from "@/stores/data";
import { formatDateShort, formatRupiah, todayISO } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TripRecord, TransactionRecord } from "@/lib/db";
import { isoDay } from "@/lib/dates";

function daysBetween(a: string, b: string) {
  const t1 = new Date(a).getTime();
  const t2 = new Date(b).getTime();
  return Math.max(1, Math.round((t2 - t1) / 86400000) + 1);
}

function tripStatus(t: TripRecord): "upcoming" | "active" | "ended" {
  const today = todayISO();
  if (today < t.startDate) return "upcoming";
  if (today > t.endDate) return "ended";
  return "active";
}

export default function TravelPage() {
  const userId = useAuth((s) => s.userId);
  const trips = useTrips(userId);
  const transactions = useTransactions(userId) ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<TripRecord | null>(null);

  return (
    <div className="animate-in">
      <AppHeader
        title="Travel"
        actions={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="min-h-[44px] rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-accent-fg"
          >
            + Trip
          </button>
        }
      />

      <div className="space-y-5 px-5 pb-8 pt-4">
        {(trips ?? []).length === 0 ? (
          <EmptyState
            emoji="🧳"
            title="Belum ada rencana trip"
            body="Catat tujuan, tanggal, dan budget harian. Pengeluaran yang ditag #trip otomatis kehitung."
            cta="Bikin trip pertama"
            onCta={() => setShowAdd(true)}
          />
        ) : (
          (trips ?? []).map((t) => (
            <TripCard
              key={t.id}
              trip={t}
              transactions={transactions}
              onEdit={() => setEditing(t)}
            />
          ))
        )}
      </div>

      <AnimatePresence>
        {showAdd && <TripSheet key="trip-add" onClose={() => setShowAdd(false)} />}
        {editing && (
          <TripSheet key={`trip-edit-${editing.id}`} trip={editing} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TripCard({
  trip,
  transactions,
  onEdit,
}: {
  trip: TripRecord;
  transactions: TransactionRecord[];
  onEdit: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const userId = useAuth((s) => s.userId);
  const status = tripStatus(trip);
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const dailyBudget = Math.round(trip.budget / totalDays);

  const tripTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.kind === "out" &&
          t.tags?.includes(trip.tag) &&
          t.date >= trip.startDate &&
          t.date <= trip.endDate,
      ),
    [transactions, trip],
  );

  const spent = tripTx.reduce((a, b) => a + b.amount, 0);
  const remaining = trip.budget - spent;
  const pct = Math.min(100, Math.round((spent / Math.max(1, trip.budget)) * 100));

  const today = todayISO();
  const daysElapsed =
    today < trip.startDate
      ? 0
      : today > trip.endDate
        ? totalDays
        : daysBetween(trip.startDate, today);

  const onTrack = remaining >= dailyBudget * (totalDays - daysElapsed);
  const statusLabel =
    status === "active"
      ? "Lagi jalan"
      : status === "upcoming"
        ? "Mendatang"
        : "Selesai";

  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[15px] font-medium text-text-1">{trip.destination}</span>
            <span className="section-label text-[12px] text-text-4">
              {statusLabel}
            </span>
          </div>
          <div className="mt-0.5 text-[12px] text-text-4">
            {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)} · {totalDays}h
          </div>
        </div>
        <button type="button" onClick={onEdit} className="min-h-[44px] px-2 text-[12px] font-semibold text-text-3 active:opacity-50">
          Ubah
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-y border-border py-3">
        <div>
          <div className="text-[12px] text-text-4">Terpakai</div>
          <div className="text-[13px] font-medium tabular-nums">
            {formatRupiah(spent)}
          </div>
        </div>
        <div>
          <div className="text-[12px] text-text-4">Sisa</div>
          <div
            className={`text-[13px] font-medium tabular-nums ${
              remaining < 0 ? "text-[color:var(--negative)]" : ""
            }`}
          >
            {formatRupiah(remaining)}
          </div>
        </div>
        <div>
          <div className="text-[12px] text-text-4">Hari ke</div>
          <div className="text-[13px] font-medium tabular-nums">
            {daysElapsed}/{totalDays}
          </div>
        </div>
      </div>

      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
        <motion.div
          className={`h-full origin-left ${
            pct >= 100
              ? "bg-[color:var(--negative)]"
              : pct >= 80
                ? "bg-[color:var(--warning)]"
                : "bg-accent"
          }`}
          initial={false}
          animate={{ scaleX: Math.max(0, Math.min(1, pct / 100)) }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[12px]">
        <span className="text-text-4">
          Per hari <span className="tabular-nums text-text-2">{formatRupiah(dailyBudget)}</span>
        </span>
        {status !== "ended" && (
          <span
            className={
              onTrack ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]"
            }
          >
            {onTrack ? "On track" : "Over budget"}
          </span>
        )}
      </div>

      <div className="mt-3 text-[12px] text-text-4">
        Tag <span className="font-mono text-text-2">#{trip.tag}</span> di transaksi otomatis kehitung.
      </div>

      {trip.packing && (
        <details className="mt-2 text-[12px]">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-text-3">Packing list</summary>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-[12px] text-text-2">
            {trip.packing}
          </pre>
        </details>
      )}

      <button
        type="button"
        onClick={() => userId && deleteTrip(userId, trip.id)}
        className="mt-2 min-h-[44px] px-2 text-[12px] text-text-4 active:opacity-50"
      >
        Hapus trip
      </button>
    </div>
  );
}

const EMOJIS = ["✈️", "🏖️", "⛰️", "🏝️", "🗼", "🚗", "🚆", "🛳️"];

function TripSheet({
  trip,
  onClose,
}: {
  trip?: TripRecord;
  onClose: () => void;
}) {
  const uid = useId();
  const userId = useAuth((s) => s.userId);
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [emoji, setEmoji] = useState(trip?.emoji ?? "✈️");
  const [startDate, setStartDate] = useState(trip?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    trip?.endDate ??
      isoDay(new Date(Date.now() + 3 * 86400000)),
  );
  const [budget, setBudget] = useState(String(trip?.budget ?? ""));
  const [packing, setPacking] = useState(trip?.packing ?? "");
  const [note, setNote] = useState(trip?.note ?? "");

  async function submit() {
    if (!userId || !destination.trim() || !budget) return;
    await upsertTrip(userId, {
      id: trip?.id,
      destination: destination.trim(),
      emoji,
      startDate,
      endDate,
      budget: parseFloat(budget) || 0,
      packing,
      note,
    });
    onClose();
  }

  return (
    <Sheet title={trip ? "Edit trip" : "Trip baru"} onClose={onClose}>
      <div className="space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Ikon trip">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Pilih ikon ${e}`}
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-xl ${
                emoji === e ? "bg-accent" : "bg-bg-elev2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <label htmlFor={`${uid}-dest`} className="block text-[12px] font-semibold text-text-3">
          Destinasi
          <input
            id={`${uid}-dest`}
            className="input-base mt-1 font-normal"
            placeholder="mis. Bali, Jepang"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <label htmlFor={`${uid}-start`} className="text-[12px] font-semibold text-text-3">
            Berangkat
            <input
              id={`${uid}-start`}
              className="input-base mt-1 text-sm font-normal"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label htmlFor={`${uid}-end`} className="text-[12px] font-semibold text-text-3">
            Pulang
            <input
              id={`${uid}-end`}
              className="input-base mt-1 text-sm font-normal"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label htmlFor={`${uid}-budget`} className="block text-[12px] font-semibold text-text-3">
          Total budget (Rp)
          <input
            id={`${uid}-budget`}
            className="input-base mt-1 tabular-nums font-normal"
            inputMode="numeric"
            placeholder="mis. 5000000"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </label>
        <label htmlFor={`${uid}-packing`} className="block text-[12px] font-semibold text-text-3">
          Packing list
          <textarea
            id={`${uid}-packing`}
            className="input-base mt-1 min-h-[80px] py-2 font-normal leading-relaxed"
            placeholder="Satu item per baris"
            value={packing}
            onChange={(e) => setPacking(e.target.value)}
          />
        </label>
        <label htmlFor={`${uid}-note`} className="block text-[12px] font-semibold text-text-3">
          Catatan (opsional)
          <input
            id={`${uid}-note`}
            className="input-base mt-1 font-normal"
            placeholder="Penginapan atau catatan perjalanan"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!destination.trim() || !budget}
          className="btn-accent w-full text-sm disabled:opacity-50"
        >
          {trip ? "Simpan perubahan" : "Bikin trip"}
        </button>
      </div>
    </Sheet>
  );
}
