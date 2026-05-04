"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
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
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg"
          >
            Trip
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

      {showAdd && <TripSheet onClose={() => setShowAdd(false)} />}
      {editing && (
        <TripSheet trip={editing} onClose={() => setEditing(null)} />
      )}
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
            <span className="text-[10px] uppercase tracking-wider text-text-4">
              {statusLabel}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-text-4">
            {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)} · {totalDays}h
          </div>
        </div>
        <button onClick={onEdit} className="text-[11px] text-text-3 active:opacity-50">
          Edit
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-y border-border py-3">
        <div>
          <div className="text-[10px] text-text-4">Terpakai</div>
          <div className="font-mono text-[13px] font-medium tabular-nums">
            {formatRupiah(spent)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-4">Sisa</div>
          <div
            className={`font-mono text-[13px] font-medium tabular-nums ${
              remaining < 0 ? "text-[color:var(--negative)]" : ""
            }`}
          >
            {formatRupiah(remaining)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-4">Hari ke</div>
          <div className="font-mono text-[13px] font-medium tabular-nums">
            {daysElapsed}/{totalDays}
          </div>
        </div>
      </div>

      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
        <div
          className={`h-full ${
            pct >= 100
              ? "bg-[color:var(--negative)]"
              : pct >= 80
                ? "bg-[color:var(--warn)]"
                : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-text-4">
          Per hari <span className="font-mono text-text-2">{formatRupiah(dailyBudget)}</span>
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

      <div className="mt-3 text-[11px] text-text-4">
        Tag <span className="font-mono text-text-2">#{trip.tag}</span> di transaksi otomatis kehitung.
      </div>

      {trip.packing && (
        <details className="mt-2 text-[12px]">
          <summary className="cursor-pointer text-text-3">Packing list</summary>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-[12px] text-text-2">
            {trip.packing}
          </pre>
        </details>
      )}

      <button
        onClick={() => userId && deleteTrip(userId, trip.id)}
        className="mt-3 text-[11px] text-text-4 active:opacity-50"
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
  const userId = useAuth((s) => s.userId);
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [emoji, setEmoji] = useState(trip?.emoji ?? "✈️");
  const [startDate, setStartDate] = useState(trip?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    trip?.endDate ??
      new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40">
      <div className="mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(20px+var(--sab))] slide-up theme-transition">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{trip ? "Edit trip" : "Trip baru"}</h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-xl ${
                  emoji === e ? "bg-accent" : "bg-bg-elev2"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className="input-base"
            placeholder="Destinasi (mis. Bali, Jepang)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <label className="text-[11px] text-text-3">
              Berangkat
              <input
                className="input-base mt-0.5 text-sm"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-[11px] text-text-3">
              Pulang
              <input
                className="input-base mt-0.5 text-sm"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <input
            className="input-base font-mono"
            inputMode="numeric"
            placeholder="Total budget (Rp)"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <textarea
            className="input-base min-h-[80px] py-2 leading-relaxed"
            placeholder="Packing list (satu item per baris)"
            value={packing}
            onChange={(e) => setPacking(e.target.value)}
          />
          <input
            className="input-base"
            placeholder="Catatan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={submit}
            disabled={!destination.trim() || !budget}
            className="btn-accent w-full text-sm disabled:opacity-50"
          >
            {trip ? "Simpan perubahan" : "Bikin trip"}
          </button>
        </div>
      </div>
    </div>
  );
}
