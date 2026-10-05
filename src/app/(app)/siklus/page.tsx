"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, Field, Chips } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { deleteEntry, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { usePeople, parsePayload, isoDay, fromIsoDay } from "@/lib/people";
import {
  DEFAULT_CYCLE_SETTINGS,
  PHASE_COPY,
  computeCycle,
  isFertileDay,
  isPeriodDay,
  isPredictedDay,
  type CycleSettings,
} from "@/lib/cycle";
import { hapticSuccess } from "@/lib/haptic";
import type { EntryRecord } from "@/lib/db";

const FLOW = [
  { value: 0, label: "–" },
  { value: 1, label: "Sedikit" },
  { value: 2, label: "Sedang" },
  { value: 3, label: "Banyak" },
];
const PAIN = [
  { value: 0, label: "Tidak" },
  { value: 1, label: "Ringan" },
  { value: 2, label: "Sedang" },
  { value: 3, label: "Berat" },
];
const MOODS = ["😊", "😌", "😐", "😢", "😠", "😴"];
const SYMPTOMS = ["Kram", "Pusing", "Kembung", "Jerawat", "Lelah", "Ngidam", "Pegal", "Susah tidur"];

interface DayLog {
  flow: number;
  pain: number;
  mood: string;
  symptoms: string[];
  note: string;
}
const EMPTY_LOG: DayLog = { flow: 0, pain: 0, mood: "", symptoms: [], note: "" };

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function SiklusPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const all = useEntries(userId, "cycle") ?? [];
  const logs = useEntries(userId, "cycle-log") ?? [];
  const settingsItems = useItems(userId, "cycle-settings") ?? [];

  // Whose cycle are we looking at? Default to whoever actually tracks one.
  const owners = useMemo(() => {
    const set = new Set(all.map((e) => e.who || me));
    return Array.from(set);
  }, [all, me]);
  const [picked, setPicked] = useState<string | null>(null);
  const person =
    picked ?? (owners.includes(me) || owners.length === 0 ? me : owners[0]);
  const isMine = person === me;

  const entries = all.filter((e) => (e.who || me) === person);
  const settingsItem = settingsItems.find((i) => (i.who || me) === person);
  const settings = parsePayload<CycleSettings>(settingsItem?.payload, DEFAULT_CYCLE_SETTINGS);
  const today = isoDay(new Date());
  const state = useMemo(() => computeCycle(entries, settings), [entries, settings]);
  const copy = PHASE_COPY[state.phase];

  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const hiddenFromMe = !isMine && !settings.shareWithPartner;

  async function mark(kind: "start" | "end", date = today) {
    if (!userId) return;
    await upsertEntry(userId, { kind: "cycle", date, valueText: kind, who: me });
    hapticSuccess();
  }

  const progress = state.dayOfCycle && state.avgCycle
    ? Math.min(1, state.dayOfCycle / state.avgCycle)
    : 0;

  return (
    <div>
      <AppHeader
        title="Siklus"
        actions={
          isMine ? (
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
            >
              Atur
            </button>
          ) : null
        }
      />

      <div className="space-y-4 px-5 pb-8 pt-3">
        {(owners.length > 1 || (partner && !owners.includes(me))) && (
          <Chips
            options={Array.from(new Set([me, ...owners])).map((n) => ({
              value: n,
              label: n === me ? "Aku" : n,
            }))}
            value={person}
            onChange={setPicked}
          />
        )}

        {hiddenFromMe ? (
          <div className="surface p-5 text-center text-[14px] text-text-3">
            {person} memilih untuk tidak membagikan siklusnya. 🤍
          </div>
        ) : (
          <>
            {/* Phase hero */}
            <div
              className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-float"
              style={{
                background:
                  state.phase === "subur"
                    ? "linear-gradient(135deg,#2bb59a,#6fd3a8)"
                    : state.phase === "tenang" || state.phase === "belum"
                      ? "linear-gradient(135deg,#8a7bd8,#c2a3f0)"
                      : "linear-gradient(135deg,#ef5a7a,#ff9a8b)",
              }}
            >
              <div className="flex items-center gap-4">
                <Ring value={progress} label={state.dayOfCycle ? `${state.dayOfCycle}` : "–"} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white/85">
                    {copy.emoji} {copy.label}
                    {state.phase === "haid" && state.lastStart
                      ? ` · hari ke-${state.dayOfCycle}`
                      : ""}
                  </div>
                  <div className="mt-1 text-[22px] font-extrabold leading-tight">
                    {state.daysUntilNext == null
                      ? "Mulai mencatat"
                      : state.phase === "haid"
                        ? "Semoga lancar 🤍"
                        : state.daysUntilNext > 0
                          ? `Haid ${state.daysUntilNext} hari lagi`
                          : state.daysUntilNext === 0
                            ? "Perkiraan haid hari ini"
                            : `Telat ${-state.daysUntilNext} hari`}
                  </div>
                  {state.nextStart && (
                    <div className="mt-0.5 text-[12px] text-white/80">
                      Perkiraan {fmt(state.nextStart)} · siklus rata-rata {state.avgCycle} hari
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[13px] leading-snug">
                {isMine ? copy.self : copy.partner}
              </p>
              {isMine && (
                <div className="mt-3 flex gap-2">
                  {state.onPeriod ? (
                    <button
                      onClick={() => mark("end")}
                      className="flex-1 rounded-full bg-white py-2.5 text-[14px] font-bold text-[#c23a5a] active:scale-[0.98]"
                    >
                      Haid selesai hari ini
                    </button>
                  ) : (
                    <button
                      onClick={() => mark("start")}
                      className="flex-1 rounded-full bg-white py-2.5 text-[14px] font-bold text-[#c23a5a] active:scale-[0.98]"
                    >
                      Haid mulai hari ini
                    </button>
                  )}
                  <button
                    onClick={() => setOpenDay(today)}
                    className="rounded-full bg-white/20 px-4 py-2.5 text-[14px] font-semibold active:scale-[0.98]"
                  >
                    Catat
                  </button>
                </div>
              )}
            </div>

            <Calendar
              month={month}
              onMonth={setMonth}
              today={today}
              isPeriod={(d) => isPeriodDay(state, d)}
              isPredicted={(d) => !isPeriodDay(state, d) && isPredictedDay(state, d, settings.periodLength)}
              isFertile={(d) => isFertileDay(state, d)}
              isOvulation={(d) => d === state.ovulation}
              hasLog={(d) => logs.some((l) => l.date === d && (l.who || me) === person)}
              onPick={isMine ? setOpenDay : undefined}
            />

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[12px] text-text-3">
              <Legend className="bg-[#ef5a7a]" label="Haid" />
              <Legend className="border-2 border-dashed border-[#ef5a7a]" label="Perkiraan haid" />
              <Legend className="bg-[#2bb59a]/70" label="Masa subur" />
              <Legend className="bg-text-4" label="Ada catatan" dot />
            </div>

            <p className="px-1 text-[11px] leading-snug text-text-4">
              Perkiraan dihitung dari rata-rata siklusmu, jadi bisa meleset. Bukan alat
              kontrasepsi dan bukan pengganti saran dokter.
            </p>
          </>
        )}
      </div>

      {openDay && userId && (
        <DaySheet
          day={openDay}
          me={me}
          userId={userId}
          entries={entries}
          log={logs.find((l) => l.date === openDay && (l.who || me) === me)}
          onClose={() => setOpenDay(null)}
        />
      )}
      {showSettings && userId && (
        <SettingsSheet
          userId={userId}
          me={me}
          itemId={settingsItem?.id}
          settings={settings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function fmt(day: string) {
  return fromIsoDay(day).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
      <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }}
        />
      </svg>
      <div className="text-center leading-none">
        <div className="text-[22px] font-extrabold">{label}</div>
        <div className="mt-0.5 text-[10px] text-white/80">hari</div>
      </div>
    </div>
  );
}

function Legend({ className, label, dot }: { className: string; label: string; dot?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`${dot ? "h-1.5 w-1.5" : "h-3 w-3"} rounded-full ${className}`} />
      {label}
    </span>
  );
}

function Calendar({
  month,
  onMonth,
  today,
  isPeriod,
  isPredicted,
  isFertile,
  isOvulation,
  hasLog,
  onPick,
}: {
  month: string;
  onMonth: (m: string) => void;
  today: string;
  isPeriod: (d: string) => boolean;
  isPredicted: (d: string) => boolean;
  isFertile: (d: string) => boolean;
  isOvulation: (d: string) => boolean;
  hasLog: (d: string) => boolean;
  onPick?: (d: string) => void;
}) {
  const first = fromIsoDay(`${month}-01`);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const shift = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1);
    onMonth(isoDay(d).slice(0, 7));
  };

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1 text-text-2" aria-label="Bulan sebelumnya">‹</button>
        <div className="text-[15px] font-bold text-text-1">
          {first.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </div>
        <button onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-full bg-bg-elev1 text-text-2" aria-label="Bulan berikutnya">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-4">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              disabled={!onPick}
              onClick={() => onPick?.(d)}
              className={`relative grid aspect-square place-items-center rounded-full text-[13px] font-semibold transition-transform active:scale-90 ${
                isPeriod(d)
                  ? "bg-[#ef5a7a] text-white"
                  : isPredicted(d)
                    ? "border-2 border-dashed border-[#ef5a7a] text-[#ef5a7a]"
                    : isFertile(d)
                      ? "bg-[#2bb59a]/20 text-[#1d8a73]"
                      : "text-text-2"
              } ${d === today ? "ring-2 ring-text-1 ring-offset-2 ring-offset-[color:var(--bg-card)]" : ""}`}
            >
              {Number(d.slice(8))}
              {isOvulation(d) && <span className="absolute -top-0.5 right-0 text-[9px]">✨</span>}
              {hasLog(d) && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-current opacity-70" />
              )}
            </button>
          ) : (
            <div key={`x${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

function DaySheet({
  day,
  me,
  userId,
  entries,
  log,
  onClose,
}: {
  day: string;
  me: string;
  userId: string;
  entries: EntryRecord[];
  log?: EntryRecord;
  onClose: () => void;
}) {
  const [data, setData] = useState<DayLog>(() => parsePayload(log?.payload, EMPTY_LOG));
  const markers = entries.filter((e) => e.date === day && (e.valueText === "start" || e.valueText === "end"));
  const isStart = markers.some((m) => m.valueText === "start");
  const isEnd = markers.some((m) => m.valueText === "end");

  async function toggleMarker(kind: "start" | "end") {
    const existing = markers.find((m) => m.valueText === kind);
    if (existing) await deleteEntry(userId, existing.id);
    else await upsertEntry(userId, { kind: "cycle", date: day, valueText: kind, who: me });
  }

  async function save() {
    await upsertEntry(userId, {
      id: log?.id,
      kind: "cycle-log",
      date: day,
      who: me,
      valueNum: data.flow,
      payload: JSON.stringify(data),
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      title={fromIsoDay(day).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
      onClose={onClose}
      footer={
        <button onClick={save} className="btn-accent w-full">
          Simpan
        </button>
      }
    >
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => toggleMarker("start")}
          className={`flex-1 rounded-2xl py-3 text-[13px] font-semibold ${isStart ? "bg-[#ef5a7a] text-white" : "bg-bg-card text-text-2 shadow-card"}`}
        >
          🌸 Hari pertama haid
        </button>
        <button
          onClick={() => toggleMarker("end")}
          className={`flex-1 rounded-2xl py-3 text-[13px] font-semibold ${isEnd ? "bg-text-1 text-bg-app" : "bg-bg-card text-text-2 shadow-card"}`}
        >
          ✔️ Hari terakhir
        </button>
      </div>
      <Field label="Darah">
        <Chips options={FLOW} value={data.flow} onChange={(v) => setData({ ...data, flow: v })} />
      </Field>
      <Field label="Nyeri">
        <Chips options={PAIN} value={data.pain} onChange={(v) => setData({ ...data, pain: v })} />
      </Field>
      <Field label="Mood">
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setData({ ...data, mood: data.mood === m ? "" : m })}
              className={`grid h-11 w-11 place-items-center rounded-full text-[22px] transition-transform ${data.mood === m ? "scale-110 bg-accent-soft" : "bg-bg-card shadow-card"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Yang dirasakan">
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOMS.map((s) => {
            const on = data.symptoms.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setData({
                    ...data,
                    symptoms: on ? data.symptoms.filter((x) => x !== s) : [...data.symptoms, s],
                  })
                }
                className={`rounded-full px-3 py-1.5 text-[13px] ${on ? "bg-accent text-accent-fg" : "bg-bg-card text-text-2 shadow-card"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Catatan">
        <textarea
          className="input-base h-20 py-2"
          value={data.note}
          onChange={(e) => setData({ ...data, note: e.target.value })}
          placeholder="Opsional"
        />
      </Field>
    </Sheet>
  );
}

function SettingsSheet({
  userId,
  me,
  itemId,
  settings,
  onClose,
}: {
  userId: string;
  me: string;
  itemId?: string;
  settings: CycleSettings;
  onClose: () => void;
}) {
  const [s, setS] = useState(settings);
  async function save() {
    await upsertItem(userId, {
      id: itemId,
      kind: "cycle-settings",
      title: "Pengaturan siklus",
      who: me,
      payload: JSON.stringify(s),
    });
    onClose();
  }
  return (
    <Sheet
      title="Atur siklus"
      onClose={onClose}
      footer={
        <button onClick={save} className="btn-accent w-full">
          Simpan
        </button>
      }
    >
      <Field label={`Panjang siklus biasanya: ${s.cycleLength} hari`}>
        <input
          type="range"
          min={21}
          max={40}
          value={s.cycleLength}
          onChange={(e) => setS({ ...s, cycleLength: Number(e.target.value) })}
          className="w-full accent-[color:var(--accent)]"
        />
      </Field>
      <Field label={`Lama haid biasanya: ${s.periodLength} hari`}>
        <input
          type="range"
          min={2}
          max={10}
          value={s.periodLength}
          onChange={(e) => setS({ ...s, periodLength: Number(e.target.value) })}
          className="w-full accent-[color:var(--accent)]"
        />
      </Field>
      <label className="flex items-center justify-between rounded-2xl bg-bg-card px-4 py-3 shadow-card">
        <span>
          <span className="block text-[14px] font-semibold text-text-1">Tampilkan ke pasangan</span>
          <span className="block text-[12px] text-text-3">
            Pasangan bisa melihat fase & perkiraanmu
          </span>
        </span>
        <input
          type="checkbox"
          checked={s.shareWithPartner}
          onChange={(e) => setS({ ...s, shareWithPartner: e.target.checked })}
          className="h-5 w-5 accent-[color:var(--accent)]"
        />
      </label>
      <p className="mt-3 text-[12px] text-text-4">
        Setelah 2 siklus tercatat, panjang siklus dihitung otomatis dari datamu.
      </p>
    </Sheet>
  );
}
