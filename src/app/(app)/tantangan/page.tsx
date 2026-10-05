"use client";

import { useNick } from "@/lib/nick";
import { useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet, Field, FieldGroup, Chips } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import { deleteEntry, deleteItem, upsertEntry, upsertItem, useEntries, useItems } from "@/stores/data";
import { usePeople, parsePayload, isoDay, addDays, daysBetween, fromIsoDay } from "@/lib/people";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { konfetti } from "@/lib/konfetti";
import type { EntryRecord, ItemRecord } from "@/lib/db";

interface ChallengePayload {
  emoji: string;
}

const TEMPLATES: { emoji: string; title: string; days: number }[] = [
  { emoji: "☕", title: "Tanpa jajan kopi", days: 14 },
  { emoji: "🚶", title: "Jalan 7.000 langkah", days: 30 },
  { emoji: "😴", title: "Tidur sebelum jam 11", days: 21 },
  { emoji: "📵", title: "HP dijauhkan 1 jam sebelum tidur", days: 14 },
  { emoji: "🛍️", title: "Tanpa belanja online", days: 30 },
  { emoji: "💪", title: "Olahraga 20 menit", days: 30 },
  { emoji: "📖", title: "Ngaji setelah Subuh", days: 30 },
  { emoji: "🥗", title: "Masak sendiri, tanpa pesan antar", days: 7 },
  { emoji: "💧", title: "Minum 8 gelas air", days: 21 },
  { emoji: "📚", title: "Baca 10 halaman buku", days: 30 },
];

const EMOJIS = ["🔥", "☕", "🚶", "😴", "📵", "🛍️", "💪", "📖", "🥗", "💧", "📚", "🧘", "🙏", "💰"];

export default function TantanganPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const challenges = useItems(userId, "challenge") ?? [];
  const logs = useEntries(userId, "challenge-log") ?? [];
  const [creating, setCreating] = useState(false);
  const today = isoDay(new Date());

  const active = challenges.filter((c) => c.status !== "done").sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const finished = challenges.filter((c) => c.status === "done").sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div>
      <AppHeader
        title="Tantangan"
        actions={
          <button onClick={() => setCreating(true)} className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-bold text-accent-fg">
            + Baru
          </button>
        }
      />
      <div className="space-y-4 px-5 pb-10 pt-3">
        {active.length === 0 ? (
          <div className="surface p-6 text-center">
            <div className="text-[40px]">🔥</div>
            <div className="mt-2 text-[17px] font-extrabold text-text-1">Tantangan berdua</div>
            <p className="mt-1 text-[13px] text-text-3">
              Pilih satu kebiasaan, jalani bareng beberapa hari, centang tiap hari. Lebih gampang konsisten kalau ada yang nemenin.
            </p>
            <button onClick={() => setCreating(true)} className="btn-accent mt-4 w-full">Mulai tantangan</button>
          </div>
        ) : (
          active.map((c) => (
            <ChallengeCard
              key={c.id}
              c={c}
              logs={logs.filter((l) => parsePayload(l.payload, { challengeId: "" }).challengeId === c.id)}
              me={me}
              partner={partner}
              today={today}
              userId={userId!}
            />
          ))
        )}

        {finished.length > 0 && (
          <div>
            <div className="mb-2 px-1 text-[15px] font-extrabold text-text-1">Sudah selesai</div>
            <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
              {finished.map((c) => {
                const n = logs.filter((l) => parsePayload(l.payload, { challengeId: "" }).challengeId === c.id).length;
                return (
                  <li key={c.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                    <span className="text-[22px]">{parsePayload<ChallengePayload>(c.payload, { emoji: "🔥" }).emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-text-1">{c.title}</div>
                      <div className="text-[12px] text-text-4">{n} centang</div>
                    </div>
                    <button onClick={() => userId && deleteItem(userId, c.id)} className="text-[12px] text-text-4">Hapus</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {creating && userId && <NewChallengeSheet userId={userId} me={me} onClose={() => setCreating(false)} />}
    </div>
  );
}

function ChallengeCard({
  c,
  logs,
  me,
  partner,
  today,
  userId,
}: {
  c: ItemRecord;
  logs: EntryRecord[];
  me: string;
  partner: string | null;
  today: string;
  userId: string;
}) {
  const p = parsePayload<ChallengePayload>(c.payload, { emoji: "🔥" });
  const { nick } = useNick();
  const start = c.date ?? today;
  const end = c.due ?? addDays(start, 29);
  const total = daysBetween(start, end) + 1;
  const dayNo = Math.min(total, Math.max(0, daysBetween(start, today) + 1));
  const people = partner ? [me, partner] : [me];
  const did = (who: string, d: string) => logs.find((l) => (l.who || me) === who && l.date === d);
  const days = Array.from({ length: total }, (_, i) => addDays(start, i));
  const both = days.filter((d) => people.every((w) => did(w, d))).length;
  const mine = days.filter((d) => did(me, d)).length;
  const ended = today > end;
  const notStarted = today < start;

  // Current streak (consecutive days up to today/yesterday where everyone checked in).
  let streak = 0;
  for (let d = today > end ? end : today; d >= start; d = addDays(d, -1)) {
    if (people.every((w) => did(w, d))) streak += 1;
    else if (d !== today) break;
  }

  async function toggle() {
    const existing = did(me, today);
    if (existing) {
      await deleteEntry(userId, existing.id);
      hapticTap();
      return;
    }
    await upsertEntry(userId, {
      kind: "challenge-log",
      date: today,
      who: me,
      payload: JSON.stringify({ challengeId: c.id }),
    });
    hapticSuccess();
    if (today === end && people.every((w) => w === me || did(w, today))) konfetti();
  }

  async function finish() {
    await upsertItem(userId, { ...c, status: "done" });
    if (both >= total * 0.8) konfetti();
  }

  return (
    <div className="surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bg-elev1 text-[26px]">{p.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold leading-tight text-text-1">{c.title}</div>
          <div className="mt-0.5 text-[12px] text-text-3">
            {notStarted
              ? `Mulai ${fromIsoDay(start).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
              : ended
                ? "Waktunya sudah habis"
                : `Hari ke-${dayNo} dari ${total}`}
            {streak > 1 && ` · 🔥 ${streak} hari beruntun`}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(total, 15)}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const marks = people.map((w) => !!did(w, d));
          const all = marks.every(Boolean);
          const some = marks.some(Boolean);
          return (
            <div
              key={d}
              title={fromIsoDay(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              className={`aspect-square rounded-[6px] ${d === today ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-card" : ""}`}
              style={{
                background: all ? "var(--accent)" : some ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "var(--bg-elev2)",
                opacity: d > today ? 0.5 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-3">
        <span>Kamu {mine}/{total}</span>
        {partner && <span>{nick(partner)} {days.filter((d) => did(partner, d)).length}/{total}</span>}
        {partner && <span>Berdua {both}</span>}
      </div>

      {partner && !notStarted && !ended && (
        <div className="mt-3 flex gap-2 text-[12px]">
          {people.map((w) => (
            <span key={w} className={`rounded-full px-2.5 py-1 font-semibold ${did(w, today) ? "bg-accent/10 text-accent" : "bg-bg-elev2 text-text-3"}`}>
              {w === me ? "Kamu" : nick(w)} {did(w, today) ? "✓ hari ini" : "belum"}
            </span>
          ))}
        </div>
      )}

      {ended ? (
        <button onClick={finish} className="btn-accent mt-3 w-full">Tutup tantangan</button>
      ) : !notStarted ? (
        <button
          onClick={toggle}
          className={`mt-3 w-full rounded-full py-3 text-[15px] font-bold transition-colors ${did(me, today) ? "bg-bg-elev2 text-text-2" : "bg-accent text-accent-fg"}`}
        >
          {did(me, today) ? "✓ Sudah hari ini (batalkan)" : "Aku sudah hari ini"}
        </button>
      ) : null}
      {!ended && (
        <button onClick={finish} className="mt-1 w-full py-1.5 text-[12px] font-semibold text-text-4">
          Akhiri sekarang
        </button>
      )}
    </div>
  );
}

function NewChallengeSheet({ userId, me, onClose }: { userId: string; me: string; onClose: () => void }) {
  const today = isoDay(new Date());
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🔥");
  const [days, setDays] = useState(30);
  const [start, setStart] = useState(today);

  async function save() {
    if (!title.trim()) return;
    await upsertItem(userId, {
      kind: "challenge",
      title: title.trim(),
      who: me,
      status: "on",
      date: start,
      due: addDays(start, days - 1),
      payload: JSON.stringify({ emoji } satisfies ChallengePayload),
    });
    hapticSuccess();
    onClose();
  }

  return (
    <Sheet
      title="Tantangan baru"
      onClose={onClose}
      footer={<button onClick={save} disabled={!title.trim()} className="btn-accent w-full disabled:opacity-50">Mulai</button>}
    >
      <FieldGroup label="Ide">
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => {
                setTitle(t.title);
                setEmoji(t.emoji);
                setDays(t.days);
              }}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${title === t.title ? "bg-accent text-accent-fg" : "bg-bg-elev2 text-text-2"}`}
            >
              {t.emoji} {t.title}
            </button>
          ))}
        </div>
      </FieldGroup>
      <Field label="Nama tantangan">
        <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Tanpa gula" />
      </Field>
      <FieldGroup label="Ikon">
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={`grid h-10 w-10 place-items-center rounded-xl text-[20px] ${emoji === e ? "bg-accent/10 ring-2 ring-accent" : "bg-bg-elev2"}`}>
              {e}
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Lama">
        <Chips
          options={[7, 14, 21, 30].map((n) => ({ value: n, label: `${n} hari` }))}
          value={days}
          onChange={setDays}
        />
      </FieldGroup>
      <FieldGroup label="Mulai">
        <Chips
          options={[
            { value: today, label: "Hari ini" },
            { value: addDays(today, 1), label: "Besok" },
          ]}
          value={start}
          onChange={setStart}
        />
      </FieldGroup>
    </Sheet>
  );
}
