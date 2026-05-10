"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/AppHeader";
import { Empty, Section } from "@/components/tracker/Section";
import { useAuth } from "@/stores/auth";
import { useItems, upsertItem, deleteItem } from "@/stores/data";
import {
  DAY_ORDER,
  indonesianDayOf,
  type ClassDay,
  type ClassItem,
} from "@/data/classes";
import type { ItemRecord } from "@/lib/db";

type ItemPlus = ItemRecord & { _parsed: ClassItem };

function parseRow(it: ItemRecord): ItemPlus {
  let parsed: ClassItem = {
    day: "Senin",
    start: "07:00",
    end: "08:40",
    title: it.title || "Mata kuliah",
    lecturer: it.who || "",
  };
  if (it.payload) {
    try {
      const p = JSON.parse(it.payload);
      parsed = { ...parsed, ...p, title: it.title, lecturer: it.who ?? p.lecturer };
    } catch {
      // ignore
    }
  }
  return { ...it, _parsed: parsed };
}

export default function JadwalPage() {
  const userId = useAuth((s) => s.userId);
  const today = indonesianDayOf(new Date());
  const [activeDay, setActiveDay] = useState<ClassDay>(today);
  const [editing, setEditing] = useState<ItemPlus | null>(null);
  const [adding, setAdding] = useState(false);

  const items = useItems(userId, "class") ?? [];

  const grouped = useMemo(() => {
    const m = new Map<ClassDay, ItemPlus[]>();
    for (const raw of items) {
      const r = parseRow(raw);
      if (!m.has(r._parsed.day)) m.set(r._parsed.day, []);
      m.get(r._parsed.day)!.push(r);
    }
    for (const [, list] of m)
      list.sort((a, b) => a._parsed.start.localeCompare(b._parsed.start));
    return m;
  }, [items]);

  const dayClasses = grouped.get(activeDay) ?? [];

  return (
    <div className="animate-in pb-12">
      <AppHeader
        title="Jadwal Kuliah"
        subtitle="Tap kelas untuk edit · tombol + untuk tambah"
        actions={
          <Link href="/home" className="text-[12px] text-text-3 active:opacity-50">
            Tutup
          </Link>
        }
      />
      <div className="px-5">
        <div className="mb-3 flex gap-1 overflow-x-auto no-scrollbar">
          {DAY_ORDER.map((d) => {
            const count = grouped.get(d)?.length ?? 0;
            const isActive = activeDay === d;
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`flex-shrink-0 rounded-md border px-3 py-1.5 text-[12px] ${
                  isActive
                    ? "border-text-1 text-text-1"
                    : "border-border text-text-3"
                } ${d === today ? "font-medium" : ""}`}
              >
                {d}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] text-text-4">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {dayClasses.length === 0 ? (
          <Empty>Tidak ada kuliah di hari {activeDay}.</Empty>
        ) : (
          <div className="space-y-1">
            {dayClasses.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditing(c)}
                className="block w-full rounded-md border-b border-border px-1 py-3 text-left transition-colors hover:bg-bg-elev1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium">{c._parsed.title}</div>
                    <div className="mt-0.5 text-[11px] text-text-3">
                      {c._parsed.lecturer}
                    </div>
                    {(c._parsed.pj || c._parsed.cp) && (
                      <div className="mt-1 text-[11px] text-text-3">
                        {c._parsed.pj && (
                          <span>
                            PJ:{" "}
                            <span className="text-text-2">{c._parsed.pj}</span>
                          </span>
                        )}
                        {c._parsed.pj && c._parsed.cp && <span> · </span>}
                        {c._parsed.cp && (
                          <span className="text-text-2">{c._parsed.cp}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[13px] tabular-nums">
                      {c._parsed.start}–{c._parsed.end}
                    </div>
                    {c._parsed.room && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-4">
                        Ruang {c._parsed.room}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setAdding(true)}
          className="mt-4 w-full rounded-full border border-border bg-bg-app py-2.5 text-[13px] font-medium text-text-2 active:bg-bg-elev1"
        >
          + Tambah kelas
        </button>

        <Recommendations day={activeDay} classes={dayClasses} />

        <Section title="Ringkasan minggu" defaultOpen={false}>
          <div className="space-y-1 text-[12px]">
            {DAY_ORDER.slice(0, 5).map((d) => {
              const list = grouped.get(d) ?? [];
              if (list.length === 0)
                return (
                  <div
                    key={d}
                    className="flex justify-between border-b border-border py-2"
                  >
                    <span className="text-text-3">{d}</span>
                    <span className="text-text-4">—</span>
                  </div>
                );
              return (
                <div
                  key={d}
                  className="flex items-start justify-between gap-3 border-b border-border py-2"
                >
                  <span className="text-text-3">{d}</span>
                  <div className="flex-1 text-right text-[11px] text-text-2">
                    {list.map((c) => (
                      <div key={c.id}>
                        {c._parsed.start} {c._parsed.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {(editing || adding) && userId && (
        <ClassEditor
          userId={userId}
          item={editing}
          defaultDay={activeDay}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function ClassEditor({
  userId,
  item,
  defaultDay,
  onClose,
}: {
  userId: string;
  item: ItemPlus | null;
  defaultDay: ClassDay;
  onClose: () => void;
}) {
  const initial: ClassItem =
    item?._parsed ??
    {
      day: defaultDay,
      start: "07:00",
      end: "08:40",
      title: "",
      lecturer: "",
    };
  const [form, setForm] = useState<ClassItem>(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof ClassItem>(k: K, v: ClassItem[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await upsertItem(userId, {
        id: item?.id,
        kind: "class",
        title: form.title.trim(),
        who: form.lecturer.trim(),
        tags: [
          form.day,
          form.start,
          form.end,
          form.room ?? "",
          form.pj ?? "",
          form.cp ?? "",
        ].filter(Boolean),
        payload: JSON.stringify(form),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!confirm(`Hapus ${form.title}?`)) return;
    setBusy(true);
    try {
      await deleteItem(userId, item.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-t-[24px] bg-bg-app p-5 pb-[calc(96px+var(--sab))] slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 text-center text-[15px] font-semibold">
          {item ? "Edit kelas" : "Tambah kelas"}
        </div>

        <div className="space-y-3">
          <Field label="Mata kuliah">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
              placeholder="Pegadaian Syariah"
            />
          </Field>
          <Field label="Dosen">
            <input
              value={form.lecturer}
              onChange={(e) => set("lecturer", e.target.value)}
              className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
              placeholder="Ibu Wiedya"
            />
          </Field>

          <Field label="Hari">
            <div className="flex flex-wrap gap-1">
              {DAY_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => set("day", d)}
                  className={`rounded-md border px-2.5 py-1 text-[11px] ${
                    form.day === d
                      ? "border-text-1 bg-text-1 text-bg-app"
                      : "border-border text-text-2"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Mulai">
              <input
                type="time"
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
              />
            </Field>
            <Field label="Selesai">
              <input
                type="time"
                value={form.end}
                onChange={(e) => set("end", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
              />
            </Field>
          </div>

          <Field label="Ruangan (opsional)">
            <input
              value={form.room ?? ""}
              onChange={(e) => set("room", e.target.value)}
              className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
              placeholder="4.21"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="PJ (opsional)">
              <input
                value={form.pj ?? ""}
                onChange={(e) => set("pj", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
                placeholder="Ihsan"
              />
            </Field>
            <Field label="CP (opsional)">
              <input
                value={form.cp ?? ""}
                onChange={(e) => set("cp", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-app px-3 py-2 text-[14px] outline-none focus:border-text-1"
                placeholder="+62 812..."
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {item && (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-full border border-border px-4 py-2.5 text-[13px] font-medium text-rose-600"
            >
              Hapus
            </button>
          )}
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-full bg-bg-elev2 py-2.5 text-[13px] font-semibold text-text-2"
          >
            Batal
          </button>
          <button
            onClick={save}
            disabled={busy || !form.title.trim()}
            className="flex-1 rounded-full bg-accent py-2.5 text-[13px] font-semibold text-accent-fg disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-text-3">{label}</div>
      {children}
    </label>
  );
}

type Slot = {
  start: string;
  end: string;
  emoji: string;
  title: string;
  detail: string;
};

const BASE_DAY_PLAN: Slot[] = [
  { start: "04:30", end: "05:30", emoji: "🌅", title: "Subuh + dzikir", detail: "Mulai hari dengan tenang" },
  { start: "05:30", end: "06:30", emoji: "🏃", title: "Olahraga ringan / jalan", detail: "15–30 menit, naikkan energi" },
  { start: "06:30", end: "07:00", emoji: "🥣", title: "Sarapan + siapkan kuliah", detail: "Protein + air 1 gelas" },
  { start: "12:00", end: "13:00", emoji: "🍽️", title: "Makan siang + Dzuhur", detail: "Istirahat aktif, jauhi layar" },
  { start: "13:00", end: "14:00", emoji: "💤", title: "Power nap (opsional)", detail: "Maks 20 menit, jangan kelamaan" },
  { start: "15:30", end: "16:30", emoji: "📚", title: "Review materi kuliah", detail: "Tulis 3 poin penting hari ini" },
  { start: "16:30", end: "17:00", emoji: "🌳", title: "Outdoor / refresh", detail: "Asar + jalan ringan" },
  { start: "19:00", end: "21:00", emoji: "🍅", title: "Pomodoro deep work", detail: "Tugas / skripsi / usaha (25×4)" },
  { start: "21:00", end: "21:30", emoji: "💞", title: "Check-in pasangan", detail: "Apresiasi + rencana besok" },
  { start: "21:30", end: "22:00", emoji: "📝", title: "Jurnal + refleksi", detail: "1 hal disyukuri, 1 yang diperbaiki" },
  { start: "22:00", end: "04:30", emoji: "🌙", title: "Tidur 7+ jam", detail: "No screen 30 menit sebelumnya" },
];

function timeOverlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return a.start < b.end && b.start < a.end;
}

function Recommendations({
  day,
  classes,
}: {
  day: ClassDay;
  classes: ItemPlus[];
}) {
  const isToday = day === indonesianDayOf(new Date());
  const nowHM = new Date().toTimeString().slice(0, 5);

  const slots = useMemo(() => {
    return BASE_DAY_PLAN.filter((slot) => {
      // hide slots that overlap with classes
      return !classes.some((c) =>
        timeOverlaps(slot, { start: c._parsed.start, end: c._parsed.end }),
      );
    });
  }, [classes]);

  return (
    <div className="mt-5 rounded-md border border-border bg-bg-elev1 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-text-1">
          Rekomendasi 24 jam produktif
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-text-4">
          {day}
        </span>
      </div>
      <p className="mb-3 text-[11px] text-text-3">
        Slot kosong di luar kuliah — tap kelas tetap muncul di atas. Disesuaikan
        bila bentrok jadwal.
      </p>
      <ul className="space-y-1.5">
        {slots.map((s) => {
          const active = isToday && nowHM >= s.start && nowHM < s.end;
          return (
            <li
              key={s.start}
              className={`flex items-start gap-3 rounded-md px-2 py-1.5 ${
                active ? "bg-bg-app ring-1 ring-text-1" : ""
              }`}
            >
              <span className="text-base leading-tight pt-0.5">{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-medium text-text-1">
                    {s.title}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-text-3">
                    {s.start}–{s.end}
                  </span>
                </div>
                <div className="text-[11px] leading-tight text-text-3">
                  {s.detail}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
