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
import { useStableArray } from "@/lib/useStableArray";

export default function KitaPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Kita"
        subtitle="Tanggal penting, date night, apresiasi, dll"
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
        <AnniversarySection />
        <DateNightSection />
        <AppreciationSection />
        <ArgumentSection />
        <BucketListSection />
        <SurpriseSection />
        <QotdSection />
      </div>
    </div>
  );
}

/* ───── Anniversary / important dates ───── */
function AnniversarySection() {
  const userId = useAuth((s) => s.userId);
  const items = useStableArray(useItems(userId, "anniv"));
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [recurring, setRecurring] = useState(true);

  async function save() {
    if (!userId || !title || !date) return;
    await upsertItem(userId, {
      kind: "anniv",
      title,
      date,
      payload: JSON.stringify({ recurring }),
    });
    setTitle("");
    setDate("");
    setShowAdd(false);
  }

  // Compute days until each
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return items
      .map((it) => {
        const d = new Date(it.date ?? today);
        const p = JSON.parse(it.payload ?? "{}");
        if (p.recurring) {
          d.setFullYear(today.getFullYear());
          if (d < today) d.setFullYear(today.getFullYear() + 1);
        }
        const days = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
        return { ...it, days, when: d.toISOString().slice(0, 10) };
      })
      .sort((a, b) => a.days - b.days);
  }, [items]);

  return (
    <Section
      title="Tanggal penting"
      caption={`${items.length} tanggal`}
      defaultOpen
      action={<AccentBtn onClick={() => setShowAdd(!showAdd)}>+</AccentBtn>}
    >
      {showAdd && (
        <div className="border-y border-border py-2.5">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Anniversary, Ultah Mama"
              className="w-full bg-transparent text-[13px] outline-none"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-text-2">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                />
                Tahunan
              </label>
              <AccentBtn onClick={save} disabled={!title || !date}>
                Simpan
              </AccentBtn>
            </div>
          </div>
        </div>
      )}
      {upcoming.length === 0 && !showAdd ? (
        <Empty>Belum ada tanggal tercatat.</Empty>
      ) : upcoming.length > 0 ? (
        <ListBox>
          {upcoming.map((it) => (
            <div key={it.id} className="flex items-center gap-3 py-2.5">
              <div className="w-12 text-center">
                <div className="font-mono text-[15px] font-semibold tabular-nums">
                  {it.days === 0 ? "hari ini" : `H-${it.days}`}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[13px]">{it.title}</div>
                <div className="text-[11px] text-text-4">
                  {formatDateShort(it.when)}
                </div>
              </div>
              <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                Hapus
              </GhostBtn>
            </div>
          ))}
        </ListBox>
      ) : null}
    </Section>
  );
}

/* ───── Date night ideas ───── */
function DateNightSection() {
  const userId = useAuth((s) => s.userId);
  const items = useStableArray(useItems(userId, "datenight"));
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("makan");

  async function save() {
    if (!userId || !title) return;
    await upsertItem(userId, {
      kind: "datenight",
      title,
      status: "todo",
      payload: JSON.stringify({ type }),
    });
    setTitle("");
    setShowAdd(false);
  }

  async function done(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      status: it.status === "done" ? "todo" : "done",
      date: it.status === "done" ? undefined : todayISO(),
    });
  }

  const todo = items.filter((it) => it.status !== "done");
  const done2 = items.filter((it) => it.status === "done");

  return (
    <Section
      title="Date night"
      caption={`${todo.length} ide · ${done2.length} sudah`}
      action={<AccentBtn onClick={() => setShowAdd(!showAdd)}>+</AccentBtn>}
    >
      {showAdd && (
        <div className="border-y border-border py-2.5">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tempat / aktivitas"
              className="w-full bg-transparent text-[13px] outline-none"
            />
            <div className="flex gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-transparent text-[13px] text-text-2 outline-none"
              >
                <option value="makan">Makan</option>
                <option value="aktivitas">Aktivitas</option>
                <option value="tempat">Tempat</option>
                <option value="film">Film</option>
              </select>
              <AccentBtn onClick={save} disabled={!title}>
                Simpan
              </AccentBtn>
            </div>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <Empty>Tambahkan ide date.</Empty>
      ) : (
        <ListBox>
          {[...todo, ...done2].map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => done(it.id)}
                  className={`h-5 w-5 rounded border ${
                    isDone
                      ? "border-accent bg-accent"
                      : "border-border bg-bg-app"
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-[13px] ${
                      isDone ? "text-text-4 line-through" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  <div className="text-[11px] text-text-4">
                    {p.type}
                    {it.date ? ` · ${formatDateShort(it.date)}` : ""}
                  </div>
                </div>
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  ×
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

/* ───── Appreciation log ───── */
function AppreciationSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useStableArray(useEntries(userId, "apresiasi"));
  const [text, setText] = useState("");

  async function add() {
    if (!userId || !text.trim()) return;
    await upsertEntry(userId, {
      kind: "apresiasi",
      date: todayISO(),
      valueText: text.trim(),
    });
    setText("");
  }

  return (
    <Section
      title="Apresiasi"
      caption={`${entries.length} catatan`}
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hari ini saya menghargai…"
            rows={2}
            className="w-full resize-none bg-transparent text-[13px] outline-none"
          />
          <div className="flex justify-end">
            <AccentBtn onClick={add} disabled={!text.trim()}>
              Catat
            </AccentBtn>
          </div>
        </div>
      </div>
      {entries.slice(0, 8).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} className="py-2.5">
              <div className="text-[13px] text-text-1">{e.valueText}</div>
              <div className="mt-0.5 flex items-center justify-between">
                <div className="text-[11px] text-text-4">
                  {formatDateShort(e.date)}
                </div>
                <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                  Hapus
                </GhostBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───── Argument log ───── */
function ArgumentSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useStableArray(useEntries(userId, "argument"));
  const [topic, setTopic] = useState("");
  const [resolution, setResolution] = useState("");

  async function add() {
    if (!userId || !topic.trim()) return;
    await upsertEntry(userId, {
      kind: "argument",
      date: todayISO(),
      valueText: topic.trim(),
      payload: JSON.stringify({ resolution: resolution.trim() }),
    });
    setTopic("");
    setResolution("");
  }

  return (
    <Section
      title="Argumen"
      caption={`${entries.length} catatan · pelajaran biar tidak terulang`}
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topik perdebatan"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Pelajaran / resolusi"
            rows={2}
            className="w-full resize-none bg-transparent text-[12px] outline-none"
          />
          <div className="flex justify-end">
            <AccentBtn onClick={add} disabled={!topic.trim()}>
              Catat
            </AccentBtn>
          </div>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => {
            const p = JSON.parse(e.payload ?? "{}");
            return (
              <div key={e.id} className="py-2.5">
                <div className="text-[13px] text-text-1">{e.valueText}</div>
                {p.resolution && (
                  <div className="mt-0.5 text-[11px] text-text-3">
                    → {p.resolution}
                  </div>
                )}
                <div className="mt-0.5 flex items-center justify-between">
                  <div className="text-[11px] text-text-4">
                    {formatDateShort(e.date)}
                  </div>
                  <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                    Hapus
                  </GhostBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ───── Bucket list ───── */
function BucketListSection() {
  const userId = useAuth((s) => s.userId);
  const items = useStableArray(useItems(userId, "bucket"));
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");

  async function save() {
    if (!userId || !title) return;
    await upsertItem(userId, {
      kind: "bucket",
      title,
      status: "todo",
    });
    setTitle("");
    setShowAdd(false);
  }

  async function toggle(id: string) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    await upsertItem(userId, {
      ...it,
      status: it.status === "done" ? "todo" : "done",
      date: it.status === "done" ? undefined : todayISO(),
    });
  }

  const done = items.filter((it) => it.status === "done");
  return (
    <Section
      title="Bucket list"
      caption={`${done.length} / ${items.length} selesai`}
      action={<AccentBtn onClick={() => setShowAdd(!showAdd)}>+</AccentBtn>}
    >
      {showAdd && (
        <div className="border-y border-border py-2.5">
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: ke Jepang bareng"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={save} disabled={!title}>
              Simpan
            </AccentBtn>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <Empty>Mimpi-mimpi yang mau diwujudkan bareng.</Empty>
      ) : (
        <ListBox>
          {items.map((it) => {
            const isDone = it.status === "done";
            return (
              <div key={it.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggle(it.id)}
                  className={`h-5 w-5 rounded border ${
                    isDone
                      ? "border-accent bg-accent"
                      : "border-border bg-bg-app"
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-[13px] ${
                      isDone ? "text-text-4 line-through" : ""
                    }`}
                  >
                    {it.title}
                  </div>
                  {isDone && it.date && (
                    <div className="text-[11px] text-text-4">
                      {formatDateShort(it.date)}
                    </div>
                  )}
                </div>
                <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                  ×
                </GhostBtn>
              </div>
            );
          })}
        </ListBox>
      )}
    </Section>
  );
}

/* ───── Surprise tracker ───── */
function SurpriseSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useStableArray(useEntries(userId, "surprise"));
  const [from, setFrom] = useState("");
  const [what, setWhat] = useState("");

  async function add() {
    if (!userId || !from || !what) return;
    await upsertEntry(userId, {
      kind: "surprise",
      date: todayISO(),
      who: from,
      valueText: what,
    });
    setWhat("");
  }

  const last = entries[0];
  return (
    <Section
      title="Surprise"
      caption={
        last
          ? `Terakhir: ${last.who} · ${formatDateShort(last.date)}`
          : "Catat siapa terakhir kasih surprise"
      }
    >
      <div className="border-y border-border py-2.5">
        <div className="space-y-2">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Dari siapa"
            className="w-full bg-transparent text-[13px] outline-none"
          />
          <div className="flex gap-2">
            <input
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Apa surprise-nya"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
            <AccentBtn onClick={add} disabled={!from || !what}>
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
                  dari {e.who} · {formatDateShort(e.date)}
                </div>
              </div>
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

/* ───── Question of the day ───── */
const QOTD_POOL = [
  "Hal kecil apa hari ini yang bikin kamu senyum?",
  "Hal apa yang lagi kamu syukuri minggu ini?",
  "Mimpi apa yang ingin kita wujudkan tahun depan?",
  "Apa pelajaran terbesar dari minggu lalu?",
  "Kalau bisa bebas keluar uang sekali, untuk apa?",
  "Quality time favorit kita berdua selama ini?",
  "Apa hal yang ingin saya pelajari darimu?",
  "Hal paling random yang pernah kita lakukan?",
  "Kebiasaan kecil pasanganmu yang bikin nyaman?",
  "Tempat favorit kita berdua, dan kenapa?",
  "Apa yang ingin kamu coba sekali seumur hidup?",
  "Memori paling lucu kita?",
];

function QotdSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useStableArray(useEntries(userId, "qotd"));
  const today = todayISO();
  const todayQ = useMemo(() => {
    // Deterministic per day so partner sees same question
    const seed = today.split("-").join("");
    const n = Number.parseInt(seed, 10) % QOTD_POOL.length;
    return QOTD_POOL[n];
  }, [today]);
  const [answer, setAnswer] = useState("");

  async function save() {
    if (!userId || !answer.trim()) return;
    await upsertEntry(userId, {
      kind: "qotd",
      date: today,
      valueText: todayQ,
      payload: JSON.stringify({ answer: answer.trim() }),
    });
    setAnswer("");
  }

  return (
    <Section
      title="Question of the day"
      caption="Pertanyaan harian buat ngobrol"
    >
      <div className="border-y border-border py-3">
        <div className="text-[13px] font-medium text-text-1">{todayQ}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Jawabanmu…"
          rows={2}
          className="mt-2 w-full resize-none bg-transparent text-[13px] outline-none"
        />
        <div className="mt-1 flex justify-end">
          <AccentBtn onClick={save} disabled={!answer.trim()}>
            Simpan
          </AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => {
            const p = JSON.parse(e.payload ?? "{}");
            return (
              <div key={e.id} className="py-2.5">
                <div className="text-[12px] text-text-3">{e.valueText}</div>
                <div className="mt-0.5 text-[13px] text-text-1">
                  {p.answer}
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <div className="text-[11px] text-text-4">
                    {formatDateShort(e.date)}
                  </div>
                  <GhostBtn onClick={() => userId && deleteEntry(userId, e.id)}>
                    Hapus
                  </GhostBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
