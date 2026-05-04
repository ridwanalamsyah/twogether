"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import {
  AccentBtn,
  Empty,
  GhostBtn,
  ListBox,
  Section,
} from "@/components/tracker/Section";
import { useAuth } from "@/stores/auth";
import {
  deleteEntry,
  deleteItem,
  upsertEntry,
  upsertItem,
  useEntries,
  useItems,
} from "@/stores/data";
import { todayISO, formatDateShort } from "@/lib/utils";

export default function SehatPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Sehat"
        subtitle="Body, periode, tidur, air, olahraga, mood, obat"
        actions={
          <Link
            href="/home"
            className="text-[12px] text-text-3 active:opacity-50"
          >
            Tutup
          </Link>
        }
      />

      <div className="px-5">
        <WaterSection />
        <WeightSection />
        <SleepSection />
        <ExerciseSection />
        <MoodSection />
        <PeriodSection />
        <BodyMetricsSection />
        <MedsSection />
      </div>
    </div>
  );
}

/* ───── Water ───── */
function WaterSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "water") ?? [];
  const today = todayISO();
  const todayTotal = entries
    .filter((e) => e.date === today)
    .reduce((s, e) => s + (e.valueNum ?? 0), 0);
  const target = 8;

  async function add(n: number) {
    if (!userId) return;
    await upsertEntry(userId, { kind: "water", date: today, valueNum: n });
  }

  return (
    <Section
      title="Air minum"
      caption={`Hari ini: ${todayTotal} / ${target} gelas`}
      defaultOpen
      action={<AccentBtn onClick={() => add(1)}>+ 1 gelas</AccentBtn>}
    >
      <div className="border-y border-border py-2.5">
        <div className="flex gap-1.5">
          {Array.from({ length: target }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-sm ${
                i < todayTotal ? "bg-accent" : "bg-bg-elev2"
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => add(2)}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-text-2 active:opacity-50"
          >
            +2
          </button>
          <button
            onClick={() => add(3)}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-text-2 active:opacity-50"
          >
            +3
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ───── Weight ───── */
function WeightSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "weight") ?? [];
  const [val, setVal] = useState("");

  async function add() {
    if (!userId || !val) return;
    const n = Number.parseFloat(val);
    if (Number.isNaN(n)) return;
    await upsertEntry(userId, {
      kind: "weight",
      date: todayISO(),
      valueNum: n,
    });
    setVal("");
  }

  const last = entries[0];
  const prev = entries[1];
  const delta = last && prev ? (last.valueNum ?? 0) - (prev.valueNum ?? 0) : 0;

  return (
    <Section
      title="Berat badan"
      caption={
        last
          ? `${last.valueNum} kg · ${
              delta > 0 ? "+" : ""
            }${delta.toFixed(1)} dari ${formatDateShort(prev?.date ?? last.date)}`
          : "Catat berat harian"
      }
    >
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="kg"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={add} disabled={!val}>
            Catat
          </AccentBtn>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 7).map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-[12px] text-text-2">
                {formatDateShort(e.date)}
              </span>
              <span className="font-mono text-[13px] tabular-nums">
                {e.valueNum} kg
              </span>
              <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                Hapus
              </GhostBtn>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───── Sleep ───── */
function SleepSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "sleep") ?? [];
  const [hours, setHours] = useState("");
  const [quality, setQuality] = useState(3);

  async function add() {
    if (!userId || !hours) return;
    const n = Number.parseFloat(hours);
    if (Number.isNaN(n)) return;
    await upsertEntry(userId, {
      kind: "sleep",
      date: todayISO(),
      valueNum: n,
      payload: JSON.stringify({ quality }),
    });
    setHours("");
  }

  const avg7 = entries.slice(0, 7).reduce((s, e) => s + (e.valueNum ?? 0), 0) /
    Math.max(1, Math.min(7, entries.length));

  return (
    <Section
      title="Tidur"
      caption={
        entries.length > 0
          ? `Rata-rata 7 hari: ${avg7.toFixed(1)} jam`
          : "Catat jam tidur"
      }
    >
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            type="number"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="jam"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <select
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value={1}>1 buruk</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5 baik</option>
          </select>
          <AccentBtn onClick={add} disabled={!hours}>
            Catat
          </AccentBtn>
        </div>
      </div>
      {entries.slice(0, 7).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 7).map((e) => {
            const q = JSON.parse(e.payload ?? "{}").quality ?? "—";
            return (
              <div
                key={e.id}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-[12px] text-text-2">
                  {formatDateShort(e.date)}
                </span>
                <span className="font-mono text-[13px] tabular-nums">
                  {e.valueNum} jam · q{q}
                </span>
                <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                  Hapus
                </GhostBtn>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ───── Exercise ───── */
function ExerciseSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "exercise") ?? [];
  const [type, setType] = useState("");
  const [mins, setMins] = useState("");

  async function add() {
    if (!userId || !type || !mins) return;
    await upsertEntry(userId, {
      kind: "exercise",
      date: todayISO(),
      valueText: type,
      valueNum: Number.parseInt(mins, 10),
    });
    setType("");
    setMins("");
  }

  return (
    <Section
      title="Olahraga"
      caption={`${entries.length} sesi total`}
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="lari, gym, yoga…"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={mins}
              onChange={(e) => setMins(e.target.value)}
              placeholder="menit"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={add} disabled={!type || !mins}>
              Catat
            </AccentBtn>
          </div>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-[13px]">{e.valueText}</div>
                <div className="text-[11px] text-text-4">
                  {formatDateShort(e.date)}
                </div>
              </div>
              <span className="font-mono text-[13px] tabular-nums text-text-2">
                {e.valueNum} mnt
              </span>
              <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                Hapus
              </GhostBtn>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───── Mood ───── */
function MoodSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "mood") ?? [];
  const today = todayISO();
  const todayMood = entries.find((e) => e.date === today);

  async function pick(n: number) {
    if (!userId) return;
    await upsertEntry(userId, {
      id: todayMood?.id,
      kind: "mood",
      date: today,
      valueNum: n,
    });
  }

  return (
    <Section
      title="Mood"
      caption={
        todayMood
          ? `Hari ini: ${moodEmoji(todayMood.valueNum ?? 3)}`
          : "Pilih emoji"
      }
    >
      <div className="border-y border-border py-3">
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => pick(n)}
              className={`h-12 w-12 rounded-md text-2xl ${
                todayMood?.valueNum === n
                  ? "bg-accent-soft"
                  : "bg-bg-elev1 active:opacity-60"
              }`}
            >
              {moodEmoji(n)}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function moodEmoji(n: number): string {
  return ["😢", "😟", "😐", "🙂", "😄"][n - 1] ?? "😐";
}

/* ───── Period (cycle) ───── */
function PeriodSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "cycle") ?? [];
  const [date, setDate] = useState(todayISO());
  const [marker, setMarker] = useState<"start" | "end" | "spotting">("start");

  async function add() {
    if (!userId) return;
    await upsertEntry(userId, {
      kind: "cycle",
      date,
      valueText: marker,
    });
  }

  const last = entries.find((e) => e.valueText === "start");
  const prediction = useMemo(() => {
    const starts = entries
      .filter((e) => e.valueText === "start")
      .map((e) => e.date)
      .sort();
    if (starts.length < 2) return null;
    // Average cycle length
    const diffs: number[] = [];
    for (let i = 1; i < starts.length; i += 1) {
      const a = new Date(starts[i - 1]).getTime();
      const b = new Date(starts[i]).getTime();
      diffs.push((b - a) / 86_400_000);
    }
    const avg = Math.round(diffs.reduce((s, n) => s + n, 0) / diffs.length);
    const next = new Date(starts[starts.length - 1]);
    next.setDate(next.getDate() + avg);
    return { avg, next: next.toISOString().slice(0, 10) };
  }, [entries]);

  return (
    <Section
      title="Periode"
      caption={
        prediction
          ? `Siklus rata-rata ${prediction.avg} hari · prediksi ${formatDateShort(prediction.next)}`
          : last
            ? `Terakhir: ${formatDateShort(last.date)}`
            : "Catat hari pertama"
      }
    >
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <select
            value={marker}
            onChange={(e) =>
              setMarker(e.target.value as "start" | "end" | "spotting")
            }
            className="bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value="start">Mulai</option>
            <option value="end">Selesai</option>
            <option value="spotting">Spotting</option>
          </select>
          <AccentBtn onClick={add}>Catat</AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2.5">
              <span className="text-[12px] text-text-2">
                {formatDateShort(e.date)}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-text-4">
                {e.valueText}
              </span>
              <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                Hapus
              </GhostBtn>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───── Body metrics ───── */
function BodyMetricsSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "body") ?? [];
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [hip, setHip] = useState("");

  async function add() {
    if (!userId || (!waist && !chest && !hip)) return;
    await upsertEntry(userId, {
      kind: "body",
      date: todayISO(),
      payload: JSON.stringify({
        waist: waist ? Number(waist) : undefined,
        chest: chest ? Number(chest) : undefined,
        hip: hip ? Number(hip) : undefined,
      }),
    });
    setWaist("");
    setChest("");
    setHip("");
  }

  return (
    <Section
      title="Lingkar tubuh"
      caption={
        entries.length > 0 ? `${entries.length} catatan` : "Pinggang, dada, pinggul"
      }
    >
      <div className="border-y border-border py-2.5">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            placeholder="Pinggang cm"
            className="bg-transparent text-[13px] outline-none"
          />
          <input
            type="number"
            value={chest}
            onChange={(e) => setChest(e.target.value)}
            placeholder="Dada cm"
            className="bg-transparent text-[13px] outline-none"
          />
          <input
            type="number"
            value={hip}
            onChange={(e) => setHip(e.target.value)}
            placeholder="Pinggul cm"
            className="bg-transparent text-[13px] outline-none"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <AccentBtn onClick={add}>Catat</AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => {
            const p = JSON.parse(e.payload ?? "{}");
            return (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <span className="text-[12px] text-text-2">
                  {formatDateShort(e.date)}
                </span>
                <span className="font-mono text-[12px] text-text-3">
                  {[p.waist && `pinggang ${p.waist}`, p.chest && `dada ${p.chest}`, p.hip && `pinggul ${p.hip}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                  Hapus
                </GhostBtn>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ───── Meds & supplements ───── */
function MedsSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "med") ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("");

  async function save() {
    if (!userId || !name) return;
    await upsertItem(userId, {
      kind: "med",
      title: name,
      payload: JSON.stringify({ dose, time }),
    });
    setName("");
    setDose("");
    setTime("");
    setShowAdd(false);
  }

  return (
    <Section
      title="Obat & suplemen"
      caption={`${items.length} item`}
      action={<AccentBtn onClick={() => setShowAdd(!showAdd)}>+</AccentBtn>}
    >
      {showAdd && (
        <div className="border-y border-border py-2.5">
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama obat"
              className="w-full bg-transparent text-[13px] outline-none"
            />
            <div className="flex gap-2">
              <input
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="Dosis"
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-transparent text-[13px] outline-none"
              />
              <AccentBtn onClick={save} disabled={!name}>
                Simpan
              </AccentBtn>
            </div>
          </div>
        </div>
      )}
      {items.length === 0 && !showAdd ? (
        <Empty>Belum ada obat tercatat.</Empty>
      ) : items.length > 0 ? (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-[13px]">{it.title}</div>
                  <div className="text-[11px] text-text-4">
                    {[p.dose, p.time].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  Hapus
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      ) : null}
    </Section>
  );
}
