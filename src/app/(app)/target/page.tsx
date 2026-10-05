"use client";

import { useNick } from "@/lib/nick";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, Field, FieldGroup, Chips } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/stores/auth";
import { deleteItem, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { usePeople, parsePayload, isoDay } from "@/lib/people";
import { hapticSuccess } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";
import type { EntryRecord, ItemRecord } from "@/lib/db";

interface TargetPayload {
  area: string;
  goal?: number;
  unit?: string;
}
interface ReviewPayload {
  q: string;
  ratings: Record<string, number>;
  good: string;
  hard: string;
  next: string;
}

const AREAS = [
  { id: "ibadah", emoji: "🤲", label: "Ibadah" },
  { id: "uang", emoji: "💰", label: "Keuangan" },
  { id: "sehat", emoji: "💪", label: "Kesehatan" },
  { id: "kuliah", emoji: "🎓", label: "Kuliah & kerja" },
  { id: "kita", emoji: "💞", label: "Hubungan" },
  { id: "diri", emoji: "🌱", label: "Diri sendiri" },
];
const areaOf = (id: string) => AREAS.find((a) => a.id === id) ?? AREAS[5];
const RATING = ["", "😣", "😕", "😐", "🙂", "🤩"];

function quarterOf(d: Date) {
  return Math.floor(d.getMonth() / 3) + 1;
}

export default function TargetPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<"target" | "review">("target");
  const [editing, setEditing] = useState<ItemRecord | "new" | null>(null);
  const [logging, setLogging] = useState<ItemRecord | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const all = useItems(userId, "target") ?? [];
  const logs = useEntries(userId, "target-log") ?? [];
  const reviews = useEntries(userId, "review-q") ?? [];
  const targets = all.filter((t) => t.date === String(year));

  const progressOf = (t: ItemRecord) =>
    logs.filter((l) => parsePayload(l.payload, { targetId: "" }).targetId === t.id).reduce((s, l) => s + (l.valueNum ?? 0), 0);
  const pctOf = (t: ItemRecord) => {
    if (t.status === "done") return 1;
    const p = parsePayload<TargetPayload>(t.payload, { area: "diri" });
    return p.goal ? Math.min(1, progressOf(t) / p.goal) : 0;
  };
  const overall = targets.length ? targets.reduce((s, t) => s + pctOf(t), 0) / targets.length : 0;
  const doneCount = targets.filter((t) => pctOf(t) >= 1).length;
  const yearPct = (now.getTime() - new Date(year, 0, 1).getTime()) / (new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime());
  const curQ = year === now.getFullYear() ? quarterOf(now) : year < now.getFullYear() ? 4 : 0;

  async function toggleDone(t: ItemRecord) {
    if (!userId) return;
    const done = t.status !== "done";
    await upsertItem(userId, { ...t, status: done ? "done" : "on" });
    if (done) {
      hapticSuccess();
      konfetti();
    }
  }

  return (
    <div>
      <AppHeader
        title="Target tahunan"
        actions={
          tab === "target" ? (
            <button onClick={() => setEditing("new")} className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-bold text-accent-fg">
              + Target
            </button>
          ) : undefined
        }
      />
      <div className="space-y-4 px-5 pb-10 pt-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setYear(year - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-bg-card text-text-2 shadow-card" aria-label="Tahun sebelumnya">‹</button>
          <div className="text-[17px] font-extrabold text-text-1">{year}</div>
          <button onClick={() => setYear(year + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-bg-card text-text-2 shadow-card" aria-label="Tahun berikutnya">›</button>
        </div>

        <div className="rounded-[24px] p-5 text-white shadow-float" style={{ background: "linear-gradient(135deg,var(--accent),#8b5cf6)" }}>
          <div className="text-[13px] font-semibold text-white/85">
            {targets.length ? `${doneCount} dari ${targets.length} target tercapai` : "Belum ada target"}
          </div>
          <div className="mt-1 font-mono text-[34px] font-extrabold leading-tight">{Math.round(overall * 100)}%</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${overall * 100}%` }} />
          </div>
          {year === now.getFullYear() && (
            <div className="mt-2 text-[12px] text-white/85">Tahun sudah berjalan {Math.round(yearPct * 100)}%</div>
          )}
        </div>

        <div className="relative grid grid-cols-2 rounded-[12px] bg-bg-elev2 p-1 text-[13px]">
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/2)] rounded-[9px] bg-bg-card shadow-sm transition-transform duration-300 ease-ios"
            style={{ transform: `translateX(${tab === "target" ? 0 : 100}%)` }}
          />
          {(["target", "review"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative py-2 font-semibold ${tab === t ? "text-text-1" : "text-text-3"}`}>
              {t === "target" ? "Target" : "Review kuartal"}
            </button>
          ))}
        </div>

        {tab === "target" ? (
          targets.length === 0 ? (
            <div className="surface p-6 text-center">
              <div className="text-[40px]">🎯</div>
              <div className="mt-2 text-[17px] font-extrabold text-text-1">Mau jadi apa kita tahun ini?</div>
              <p className="mt-1 text-[13px] text-text-3">Tulis 3–6 target saja. Yang angka bisa dicicil, yang lain tinggal dicentang.</p>
              <button onClick={() => setEditing("new")} className="btn-accent mt-4 w-full">Tulis target</button>
            </div>
          ) : (
            AREAS.filter((a) => targets.some((t) => parsePayload<TargetPayload>(t.payload, { area: "diri" }).area === a.id)).map((a) => (
              <div key={a.id}>
                <div className="mb-2 px-1 text-[13px] font-bold text-text-3">{a.emoji} {a.label}</div>
                <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
                  {targets
                    .filter((t) => parsePayload<TargetPayload>(t.payload, { area: "diri" }).area === a.id)
                    .map((t) => {
                      const p = parsePayload<TargetPayload>(t.payload, { area: "diri" });
                      const pct = pctOf(t);
                      return (
                        <li key={t.id} className="border-b border-border last:border-0">
                          <SwipeRow onDelete={() => userId && deleteItem(userId, t.id)}>
                            <div className="flex items-center gap-3 bg-bg-card px-4 py-3">
                              {p.goal ? (
                                <button onClick={() => setLogging(t)} className="min-w-0 flex-1 text-left">
                                  <div className={`truncate text-[14px] font-semibold ${pct >= 1 ? "text-text-3 line-through" : "text-text-1"}`}>{t.title}</div>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-elev2">
                                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct * 100}%` }} />
                                    </div>
                                    <span className="shrink-0 font-mono text-[11px] text-text-3">
                                      {progressOf(t).toLocaleString("id-ID")}/{p.goal.toLocaleString("id-ID")} {p.unit}
                                    </span>
                                  </div>
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => toggleDone(t)}
                                    aria-label={t.status === "done" ? "Tandai belum" : "Tandai tercapai"}
                                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[12px] ${t.status === "done" ? "border-accent bg-accent text-accent-fg" : "border-border"}`}
                                  >
                                    {t.status === "done" ? "✓" : ""}
                                  </button>
                                  <button onClick={() => setEditing(t)} className={`min-w-0 flex-1 truncate text-left text-[14px] font-semibold ${t.status === "done" ? "text-text-3 line-through" : "text-text-1"}`}>
                                    {t.title}
                                  </button>
                                </>
                              )}
                              <span className="shrink-0 text-[11px] text-text-4">{t.who === "berdua" ? "Berdua" : t.who === me ? "Kamu" : nick(t.who)}</span>
                            </div>
                          </SwipeRow>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))
          )
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((q) => {
              const key = `${year}-Q${q}`;
              const rs = reviews.filter((r) => parsePayload<ReviewPayload>(r.payload, { q: "", ratings: {}, good: "", hard: "", next: "" }).q === key);
              const mine = rs.find((r) => (r.who || me) === me);
              const theirs = rs.filter((r) => (r.who || me) !== me);
              const locked = q > curQ;
              return (
                <div key={q} className={`surface p-4 ${locked ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[15px] font-extrabold text-text-1">Kuartal {q}</div>
                      <div className="text-[12px] text-text-3">
                        {new Date(year, (q - 1) * 3, 1).toLocaleDateString("id-ID", { month: "short" })}–
                        {new Date(year, q * 3 - 1, 1).toLocaleDateString("id-ID", { month: "short" })}
                        {q === curQ && year === now.getFullYear() ? " · sekarang" : ""}
                      </div>
                    </div>
                    {!locked && (
                      <button onClick={() => setReviewing(key)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${mine ? "bg-bg-elev2 text-text-2" : "bg-accent text-accent-fg"}`}>
                        {mine ? "Ubah" : "Isi review"}
                      </button>
                    )}
                  </div>
                  {[mine, ...theirs].filter(Boolean).map((r) => (
                    <ReviewView key={r!.id} r={r!} me={me} targets={targets} />
                  ))}
                  {!locked && partner && !theirs.length && mine && (
                    <p className="mt-2 text-[12px] text-text-4">{nick(partner)} belum mengisi.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && userId && (
        <TargetSheet
          userId={userId}
          year={year}
          me={me}
          partner={partner}
          target={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {logging && userId && (
        <LogSheet
          userId={userId}
          me={me}
          target={logging}
          current={progressOf(logging)}
          logs={logs.filter((l) => parsePayload(l.payload, { targetId: "" }).targetId === logging.id)}
          onEdit={() => {
            setEditing(logging);
            setLogging(null);
          }}
          onClose={() => setLogging(null)}
        />
      )}
      {reviewing && userId && (
        <ReviewSheet
          userId={userId}
          me={me}
          q={reviewing}
          targets={targets}
          existing={reviews.find(
            (r) => (r.who || me) === me && parsePayload<ReviewPayload>(r.payload, { q: "", ratings: {}, good: "", hard: "", next: "" }).q === reviewing,
          )}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

function ReviewView({ r, me, targets }: { r: EntryRecord; me: string; targets: ItemRecord[] }) {
  const p = parsePayload<ReviewPayload>(r.payload, { q: "", ratings: {}, good: "", hard: "", next: "" });
  const { nick } = useNick();
  const rated = targets.filter((t) => p.ratings[t.id]);
  return (
    <div className="mt-3 rounded-2xl bg-bg-elev1 p-3 text-[13px]">
      <div className="mb-1 text-[12px] font-bold text-text-3">{(r.who || me) === me ? "Kamu" : nick(r.who)}</div>
      {rated.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {rated.map((t) => (
            <span key={t.id} className="rounded-full bg-bg-card px-2 py-0.5 text-[12px] text-text-2">
              {RATING[p.ratings[t.id]]} {t.title}
            </span>
          ))}
        </div>
      )}
      {p.good && <p className="text-text-1"><b>Berhasil:</b> {p.good}</p>}
      {p.hard && <p className="mt-1 text-text-1"><b>Belum jalan:</b> {p.hard}</p>}
      {p.next && <p className="mt-1 text-text-1"><b>Fokus berikutnya:</b> {p.next}</p>}
    </div>
  );
}

function TargetSheet({
  userId,
  year,
  me,
  partner,
  target,
  onClose,
}: {
  userId: string;
  year: number;
  me: string;
  partner: string | null;
  target: ItemRecord | null;
  onClose: () => void;
}) {
  const p0 = parsePayload<TargetPayload>(target?.payload, { area: "diri" });
  const [title, setTitle] = useState(target?.title ?? "");
  const [area, setArea] = useState(p0.area);
  const [who, setWho] = useState(target?.who ?? (partner ? "berdua" : me));
  const [numeric, setNumeric] = useState(!!p0.goal);
  const [goal, setGoal] = useState(p0.goal ? String(p0.goal) : "");
  const [unit, setUnit] = useState(p0.unit ?? "");

  async function save() {
    if (!title.trim()) return;
    await upsertItem(userId, {
      ...(target ?? {}),
      kind: "target",
      title: title.trim(),
      date: String(year),
      who,
      status: target?.status ?? "on",
      payload: JSON.stringify({
        area,
        goal: numeric && Number(goal) > 0 ? Number(goal) : undefined,
        unit: numeric ? unit.trim() || undefined : undefined,
      } satisfies TargetPayload),
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      title={target ? "Ubah target" : "Target baru"}
      onClose={onClose}
      footer={<button onClick={save} disabled={!title.trim()} className="btn-accent w-full disabled:opacity-50">Simpan</button>}
    >
      <Field label="Targetnya">
        <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Khatam Al-Qur'an 2×" autoFocus />
      </Field>
      <FieldGroup label="Bidang">
        <Chips options={AREAS.map((a) => ({ value: a.id, label: `${a.emoji} ${a.label}` }))} value={area} onChange={setArea} />
      </FieldGroup>
      <FieldGroup label="Punya siapa">
        <Chips
          options={[
            ...(partner ? [{ value: "berdua", label: "Berdua" }] : []),
            { value: me, label: "Aku" },
            ...(partner ? [{ value: partner, label: partner }] : []),
          ]}
          value={who}
          onChange={setWho}
        />
      </FieldGroup>
      <FieldGroup label="Cara mengukur">
        <Chips
          options={[
            { value: "centang", label: "Centang saja" },
            { value: "angka", label: "Pakai angka" },
          ]}
          value={numeric ? "angka" : "centang"}
          onChange={(v) => setNumeric(v === "angka")}
        />
      </FieldGroup>
      {numeric && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Jumlah">
            <input className="input-base" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ""))} placeholder="12" />
          </Field>
          <Field label="Satuan">
            <input className="input-base" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="buku / juta / km" />
          </Field>
        </div>
      )}
    </Sheet>
  );
}

function LogSheet({
  userId,
  me,
  target,
  current,
  logs,
  onEdit,
  onClose,
}: {
  userId: string;
  me: string;
  target: ItemRecord;
  current: number;
  logs: EntryRecord[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const p = parsePayload<TargetPayload>(target.payload, { area: "diri" });
  const [n, setN] = useState("1");

  async function add() {
    const v = Number(n);
    if (!v) return;
    await upsertEntry(userId, {
      kind: "target-log",
      date: isoDay(new Date()),
      who: me,
      valueNum: v,
      payload: JSON.stringify({ targetId: target.id }),
    });
    hapticSuccess();
    if (p.goal && current < p.goal && current + v >= p.goal) konfetti();
    onClose();
  }

  return (
    <Sheet title={target.title} onClose={onClose} footer={<button onClick={add} className="btn-accent w-full">Tambah</button>}>
      <p className="mb-3 text-[13px] text-text-3">
        Sekarang {current.toLocaleString("id-ID")} dari {p.goal?.toLocaleString("id-ID")} {p.unit}
      </p>
      <Field label={`Tambah berapa ${p.unit ?? ""}`}>
        <input className="input-base" inputMode="decimal" value={n} onChange={(e) => setN(e.target.value.replace(/[^\d.-]/g, ""))} />
      </Field>
      {logs.length > 0 && (
        <div className="mb-3 max-h-40 overflow-y-auto text-[12px] text-text-3">
          {[...logs]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10)
            .map((l) => (
              <div key={l.id} className="flex justify-between py-1">
                <span>{l.date} · {(l.who || me) === me ? "Kamu" : l.who}</span>
                <span className="font-mono">+{l.valueNum}</span>
              </div>
            ))}
        </div>
      )}
      <button onClick={onEdit} className="text-[13px] font-semibold text-accent">Ubah target</button>
    </Sheet>
  );
}

function ReviewSheet({
  userId,
  me,
  q,
  targets,
  existing,
  onClose,
}: {
  userId: string;
  me: string;
  q: string;
  targets: ItemRecord[];
  existing?: EntryRecord;
  onClose: () => void;
}) {
  const p0 = parsePayload<ReviewPayload>(existing?.payload, { q, ratings: {}, good: "", hard: "", next: "" });
  const [ratings, setRatings] = useState<Record<string, number>>(p0.ratings);
  const [good, setGood] = useState(p0.good);
  const [hard, setHard] = useState(p0.hard);
  const [next, setNext] = useState(p0.next);
  const [y, qn] = q.split("-Q").map(Number);

  async function save() {
    await upsertEntry(userId, {
      id: existing?.id,
      kind: "review-q",
      date: isoDay(new Date(y, qn * 3, 0)),
      who: me,
      payload: JSON.stringify({ q, ratings, good, hard, next } satisfies ReviewPayload),
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet title={`Review kuartal ${qn}`} onClose={onClose} footer={<button onClick={save} className="btn-accent w-full">Simpan</button>}>
      {targets.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-[12px] font-semibold text-text-3">Gimana tiap target?</div>
          {targets.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[13px] text-text-1">{t.title}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setRatings({ ...ratings, [t.id]: v })}
                    className={`grid h-8 w-8 place-items-center rounded-full text-[16px] ${ratings[t.id] === v ? "bg-accent/10 ring-2 ring-accent" : "opacity-50"}`}
                  >
                    {RATING[v]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Field label="Apa yang berhasil?">
        <textarea className="input-base min-h-[72px] py-2" value={good} onChange={(e) => setGood(e.target.value)} />
      </Field>
      <Field label="Apa yang belum jalan, kenapa?">
        <textarea className="input-base min-h-[72px] py-2" value={hard} onChange={(e) => setHard(e.target.value)} />
      </Field>
      <Field label="Fokus 3 bulan ke depan">
        <textarea className="input-base min-h-[72px] py-2" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
    </Sheet>
  );
}
