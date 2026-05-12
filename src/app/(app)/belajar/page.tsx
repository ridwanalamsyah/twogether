"use client";

import { useEffect, useRef, useState } from "react";
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
import { useWorkspace } from "@/stores/workspace";
import {
  deleteEntry,
  deleteItem,
  upsertEntry,
  upsertItem,
  useEntries,
  useItems,
} from "@/stores/data";
import { emitFeed } from "@/services/feed";
import { todayISO, formatDateShort } from "@/lib/utils";

export default function BelajarPage() {
  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Belajar"
        subtitle="Reading, kursus, jurnal, pomodoro, time"
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
        <ReadingSection />
        <CourseSection />
        <JournalSection />
        <PomodoroSection />
        <TimeSection />
      </div>
    </div>
  );
}

/* ───── Reading log ───── */
function ReadingSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "book") ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");

  async function save() {
    if (!userId || !title) return;
    await upsertItem(userId, {
      kind: "book",
      title,
      status: "reading",
      payload: JSON.stringify({
        author,
        pages: pages ? Number(pages) : 0,
        progress: 0,
      }),
    });
    setTitle("");
    setAuthor("");
    setPages("");
    setShowAdd(false);
  }

  async function progress(id: string, delta: number) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const p = JSON.parse(it.payload ?? "{}");
    const newProg = Math.max(0, Math.min(p.pages ?? 9999, (p.progress ?? 0) + delta));
    const status = p.pages && newProg >= p.pages ? "done" : "reading";
    await upsertItem(userId, {
      ...it,
      status,
      payload: JSON.stringify({ ...p, progress: newProg }),
    });
  }

  return (
    <Section
      title="Reading"
      caption={`${items.filter((b) => b.status === "reading").length} sedang dibaca · ${items.filter((b) => b.status === "done").length} selesai`}
      defaultOpen
      action={<AccentBtn onClick={() => setShowAdd(!showAdd)}>+</AccentBtn>}
    >
      {showAdd && (
        <div className="border-y border-border py-2.5">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul buku"
              className="w-full bg-transparent text-[13px] outline-none"
            />
            <div className="flex gap-2">
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Penulis"
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <input
                type="number"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="Total hal"
                className="w-24 bg-transparent text-[13px] outline-none"
              />
              <AccentBtn onClick={save} disabled={!title}>
                Simpan
              </AccentBtn>
            </div>
          </div>
        </div>
      )}
      {items.length === 0 && !showAdd ? (
        <Empty>Tambahkan buku yang lagi dibaca.</Empty>
      ) : items.length > 0 ? (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const total = p.pages ?? 0;
            const prog = p.progress ?? 0;
            const pct = total ? Math.round((prog / total) * 100) : 0;
            return (
              <div key={it.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-[13px]">{it.title}</div>
                    <div className="text-[11px] text-text-4">
                      {p.author || "—"} · {prog}/{total || "?"} hal
                      {pct ? ` · ${pct}%` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => progress(it.id, -10)}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] text-text-3"
                  >
                    -10
                  </button>
                  <button
                    onClick={() => progress(it.id, 10)}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] text-text-3"
                  >
                    +10
                  </button>
                  <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                    ×
                  </GhostBtn>
                </div>
                {total > 0 && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded bg-bg-elev2">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </ListBox>
      ) : null}
    </Section>
  );
}

/* ───── Course tracker ───── */
function CourseSection() {
  const userId = useAuth((s) => s.userId);
  const items = useItems(userId, "course") ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [modules, setModules] = useState("");

  async function save() {
    if (!userId || !title) return;
    await upsertItem(userId, {
      kind: "course",
      title,
      status: "ongoing",
      payload: JSON.stringify({
        provider,
        modules: modules ? Number(modules) : 0,
        completed: 0,
      }),
    });
    setTitle("");
    setProvider("");
    setModules("");
    setShowAdd(false);
  }

  async function bump(id: string, delta: number) {
    if (!userId) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const p = JSON.parse(it.payload ?? "{}");
    const c = Math.max(0, Math.min(p.modules ?? 9999, (p.completed ?? 0) + delta));
    await upsertItem(userId, {
      ...it,
      status: p.modules && c >= p.modules ? "done" : "ongoing",
      payload: JSON.stringify({ ...p, completed: c }),
    });
  }

  return (
    <Section
      title="Kursus"
      caption={`${items.length} kursus`}
      action={<AccentBtn onClick={() => setShowAdd(!showAdd)}>+</AccentBtn>}
    >
      {showAdd && (
        <div className="border-y border-border py-2.5">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul kursus"
              className="w-full bg-transparent text-[13px] outline-none"
            />
            <div className="flex gap-2">
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Coursera, Udemy…"
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <input
                type="number"
                value={modules}
                onChange={(e) => setModules(e.target.value)}
                placeholder="modul"
                className="w-20 bg-transparent text-[13px] outline-none"
              />
              <AccentBtn onClick={save} disabled={!title}>
                Simpan
              </AccentBtn>
            </div>
          </div>
        </div>
      )}
      {items.length === 0 && !showAdd ? (
        <Empty>Belum ada kursus.</Empty>
      ) : items.length > 0 ? (
        <ListBox>
          {items.map((it) => {
            const p = JSON.parse(it.payload ?? "{}");
            const total = p.modules ?? 0;
            const c = p.completed ?? 0;
            const pct = total ? Math.round((c / total) * 100) : 0;
            return (
              <div key={it.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-[13px]">{it.title}</div>
                    <div className="text-[11px] text-text-4">
                      {p.provider || "—"} · {c}/{total || "?"} modul
                    </div>
                  </div>
                  <button
                    onClick={() => bump(it.id, 1)}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] text-text-3"
                  >
                    +1
                  </button>
                  <GhostBtn onClick={() => userId && deleteItem(userId, it.id)}>
                    ×
                  </GhostBtn>
                </div>
                {total > 0 && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded bg-bg-elev2">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </ListBox>
      ) : null}
    </Section>
  );
}

/* ───── Journal ───── */
function JournalSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "journal") ?? [];
  const [text, setText] = useState("");

  async function add() {
    if (!userId || !text.trim()) return;
    await upsertEntry(userId, {
      kind: "journal",
      date: todayISO(),
      valueText: text.trim(),
    });
    setText("");
  }

  return (
    <Section title="Jurnal" caption={`${entries.length} catatan`}>
      <div className="border-y border-border py-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis bebas hari ini…"
          rows={3}
          className="w-full resize-none bg-transparent text-[13px] outline-none"
        />
        <div className="mt-1 flex justify-end">
          <AccentBtn onClick={add} disabled={!text.trim()}>
            Simpan
          </AccentBtn>
        </div>
      </div>
      {entries.slice(0, 5).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="py-2.5">
              <div className="whitespace-pre-wrap text-[13px] text-text-1">
                {e.valueText}
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
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───── Pomodoro timer ───── */
function PomodoroSection() {
  const userId = useAuth((s) => s.userId);
  const meName = useWorkspace((s) => s.members.find((m) => m.isMe)?.name);
  const entries = useEntries(userId, "pomodoro") ?? [];
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          if (userId) {
            void upsertEntry(userId, {
              kind: "pomodoro",
              date: todayISO(),
              valueNum: duration,
              who: meName,
            });
            void emitFeed(userId, {
              who: meName,
              type: "pomodoro",
              text: `Selesai pomodoro ${duration} menit`,
            });
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running, duration, userId, meName]);

  function start() {
    setRemaining(duration * 60);
    setRunning(true);
  }
  function stop() {
    setRunning(false);
    setRemaining(0);
  }

  const todayMin = entries
    .filter((e) => e.date === todayISO())
    .reduce((s, e) => s + (e.valueNum ?? 0), 0);

  return (
    <Section
      title="Pomodoro"
      caption={`Hari ini ${todayMin} menit fokus`}
    >
      <div className="border-y border-border py-3">
        <div className="text-center">
          <div className="font-mono text-[36px] font-light tabular-nums">
            {String(Math.floor((remaining || duration * 60) / 60)).padStart(2, "0")}:
            {String((remaining || duration * 60) % 60).padStart(2, "0")}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={running}
              className="bg-transparent text-[13px] text-text-2 outline-none"
            >
              <option value={15}>15 mnt</option>
              <option value={25}>25 mnt</option>
              <option value={45}>45 mnt</option>
              <option value={60}>60 mnt</option>
            </select>
            {running ? (
              <button
                onClick={stop}
                className="rounded-md border border-border px-3 py-1 text-[12px]"
              >
                Stop
              </button>
            ) : (
              <AccentBtn onClick={start}>Mulai</AccentBtn>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ───── Time tracking ───── */
function TimeSection() {
  const userId = useAuth((s) => s.userId);
  const entries = useEntries(userId, "time") ?? [];
  const [cat, setCat] = useState("kerja");
  const [mins, setMins] = useState("");

  async function add() {
    if (!userId || !mins) return;
    await upsertEntry(userId, {
      kind: "time",
      date: todayISO(),
      valueText: cat,
      valueNum: Number.parseInt(mins, 10),
    });
    setMins("");
  }

  // Today's totals by category
  const today = todayISO();
  const todayEntries = entries.filter((e) => e.date === today);
  const totals = todayEntries.reduce<Record<string, number>>((acc, e) => {
    const k = e.valueText ?? "lain";
    acc[k] = (acc[k] ?? 0) + (e.valueNum ?? 0);
    return acc;
  }, {});
  const total = Object.values(totals).reduce((s, n) => s + n, 0);

  return (
    <Section
      title="Time tracking"
      caption={`Hari ini total ${total} menit`}
    >
      <div className="border-y border-border py-2.5">
        <div className="flex gap-2">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="bg-transparent text-[13px] text-text-2 outline-none"
          >
            <option value="kerja">Kerja</option>
            <option value="skripsi">Skripsi</option>
            <option value="belajar">Belajar</option>
            <option value="hp">Main HP</option>
            <option value="sosial">Sosial</option>
            <option value="istirahat">Istirahat</option>
            <option value="lain">Lain</option>
          </select>
          <input
            type="number"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            placeholder="menit"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <AccentBtn onClick={add} disabled={!mins}>
            Catat
          </AccentBtn>
        </div>
      </div>
      {Object.keys(totals).length > 0 && (
        <div className="mt-2 divide-y divide-border border-y border-border">
          {Object.entries(totals).map(([k, v]) => {
            const pct = total ? (v / total) * 100 : 0;
            return (
              <div key={k} className="py-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text-2 capitalize">{k}</span>
                  <span className="font-mono text-text-3">{v} mnt</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded bg-bg-elev2">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
