"use client";

import { useEffect, useMemo, useState } from "react";
import { NotebookPen, UserRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/stores/auth";
import {
  deleteSkripsiBimbingan,
  deleteSkripsiChapter,
  ensureDefaultSkripsiChapters,
  upsertSkripsiBimbingan,
  upsertSkripsiChapter,
  upsertSkripsiMeta,
  useSkripsiBimbingan,
  useSkripsiChapters,
  useSkripsiMeta,
} from "@/stores/data";
import { formatDateShort, todayISO } from "@/lib/utils";
import type { SkripsiBimbinganRecord, SkripsiChapterRecord } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "bab" | "bimbingan" | "meta";

export default function SkripsiPage() {
  const userId = useAuth((s) => s.userId);
  const chapters = useSkripsiChapters(userId);
  const bimbingan = useSkripsiBimbingan(userId);
  const meta = useSkripsiMeta(userId);
  const [tab, setTab] = useState<Tab>("bab");
  const [editChapter, setEditChapter] = useState<SkripsiChapterRecord | null>(
    null,
  );
  const [editBimbingan, setEditBimbingan] =
    useState<SkripsiBimbinganRecord | null>(null);
  const [showAddBimbingan, setShowAddBimbingan] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!userId) return;
    void ensureDefaultSkripsiChapters(userId);
  }, [userId]);

  const overall = useMemo(() => {
    const cs = chapters ?? [];
    if (cs.length === 0) return 0;
    const sum = cs.reduce((a, c) => a + (c.progress || 0), 0);
    return Math.round(sum / cs.length);
  }, [chapters]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Skripsi"
        subtitle={meta?.judul || undefined}
      />

      <div className="px-5 pt-4 pb-8">
        <div className="flex items-baseline justify-between gap-3">
          <span className="tabular-nums text-[28px] font-semibold tracking-tight text-text-1">
            {overall}%
          </span>
          <span className="text-[12px] text-text-3">
            {(chapters ?? []).length} BAB · {(bimbingan ?? []).length} bimbingan
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elev2">
          <motion.div
            className="h-full w-full origin-left rounded-full bg-accent"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: overall / 100 }}
            transition={{ duration: reduce ? 0.04 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div role="tablist" aria-label="Bagian skripsi" className="mt-5 flex gap-5 border-b border-border text-xs">
          {(
            [
              { id: "bab", label: "BAB" },
              { id: "bimbingan", label: "Bimbingan" },
              { id: "meta", label: "Info" },
            ] as { id: Tab; label: string }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`relative min-h-[44px] py-2 font-medium transition-colors ${
                  active ? "text-text-1" : "text-text-4"
                }`}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="skripsi-tab-line"
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-text-1"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 520, damping: 38 }
                    }
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-3">

        {tab === "bab" && (
          <div className="space-y-2">
          {/* keep existing */}
            {(chapters ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEditChapter(c)}
                className="surface block min-h-[44px] w-full p-3 text-left theme-transition active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold section-label text-text-3">
                      BAB {c.number}
                    </div>
                    <div className="truncate font-semibold text-text-1">
                      {c.title}
                    </div>
                    {c.subtitle && (
                      <div className="mt-0.5 truncate text-xs text-text-3">
                        {c.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="tabular-nums text-sm font-bold">
                    {c.progress}%
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elev3">
                  <motion.div
                    className="h-full w-full origin-left rounded-full bg-accent"
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: c.progress / 100 }}
                    transition={{ duration: reduce ? 0.04 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12px]">
                  <span className="text-text-2">{c.status}</span>
                  {c.note && (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-text-3">
                      <NotebookPen size={12} className="shrink-0" aria-hidden="true" />
                      {c.note}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "bimbingan" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAddBimbingan(true)}
              className="btn-soft w-full text-sm"
            >
              + Tambah bimbingan
            </button>
            {(bimbingan ?? []).length === 0 ? (
              <EmptyState
                emoji="📝"
                title="Belum ada bimbingan tercatat"
                body="Catat jadwal & arahan dosen agar revisi rapi."
              />
            ) : (
              (bimbingan ?? []).map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setEditBimbingan(b)}
                  className="surface block min-h-[44px] w-full p-3 text-left theme-transition"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold text-text-1">{b.topic}</div>
                    <div className="text-[12px] text-text-3">
                      {formatDateShort(b.date)}
                    </div>
                  </div>
                  {b.dosen && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-2">
                      <UserRound size={12} aria-hidden="true" />
                      <span>{b.dosen}</span>
                    </div>
                  )}
                  {b.notes && (
                    <div className="mt-1 line-clamp-2 text-xs text-text-3">
                      {b.notes}
                    </div>
                  )}
                  {b.todo && (
                    <div className="mt-1 rounded bg-accent-soft px-2 py-1 text-[12px] font-semibold text-accent">
                      TODO: {b.todo}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {tab === "meta" && <SkripsiMetaForm />}
        </div>
      </div>

      <AnimatePresence>
        {editChapter && (
          <ChapterSheet
            key={`chap-${editChapter.id}`}
            chapter={editChapter}
            onClose={() => setEditChapter(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(showAddBimbingan || editBimbingan) && (
          <BimbinganSheet
            key={editBimbingan ? `bimb-${editBimbingan.id}` : "bimb-new"}
            record={editBimbingan}
            onClose={() => {
              setShowAddBimbingan(false);
              setEditBimbingan(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SkripsiMetaForm() {
  const userId = useAuth((s) => s.userId);
  const meta = useSkripsiMeta(userId);
  const [judul, setJudul] = useState("");
  const [dosen, setDosen] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (meta) {
      setJudul(meta.judul);
      setDosen(meta.dosen);
      setTarget(meta.target);
    }
  }, [meta]);

  async function save() {
    if (!userId) return;
    await upsertSkripsiMeta(userId, { judul, dosen, target });
  }

  return (
    <div className="surface space-y-3 p-4">
      <Field label="Judul skripsi">
        <input
          className="input-base"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="misal: Analisis penerapan PPH UMKM…"
        />
      </Field>
      <Field label="Dosen pembimbing">
        <input
          className="input-base"
          value={dosen}
          onChange={(e) => setDosen(e.target.value)}
          placeholder="Nama dosen"
        />
      </Field>
      <Field label="Target sidang">
        <input
          type="date"
          className="input-base"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </Field>
      <button type="button" onClick={save} className="btn-accent w-full text-sm">
        Simpan
      </button>
    </div>
  );
}

function ChapterSheet({
  chapter,
  onClose,
}: {
  chapter: SkripsiChapterRecord;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const [title, setTitle] = useState(chapter.title);
  const [subtitle, setSubtitle] = useState(chapter.subtitle ?? "");
  const [progress, setProgress] = useState(chapter.progress);
  const [status, setStatus] = useState(chapter.status);
  const [note, setNote] = useState(chapter.note ?? "");

  async function save() {
    if (!userId) return;
    await upsertSkripsiChapter(userId, {
      id: chapter.id,
      title,
      subtitle,
      progress,
      status,
      note,
    });
    onClose();
  }

  async function del() {
    if (!userId) return;
    if (!confirm("Hapus BAB ini?")) return;
    await deleteSkripsiChapter(userId, chapter.id);
    onClose();
  }

  return (
    <Sheet title={`Edit BAB ${chapter.number}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Judul">
          <input
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Subjudul (opsional)">
          <input
            className="input-base"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </Field>
        <Field label={`Progres (${progress}%)`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            className="min-h-[44px] w-full accent-[color:var(--accent)]"
          />
        </Field>
        <Field label="Status">
          <select
            className="input-base"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Belum mulai</option>
            <option>Sedang dikerjakan</option>
            <option>Revisi</option>
            <option>Selesai</option>
          </select>
        </Field>
        <Field label="Catatan">
          <textarea
            className="input-base min-h-[80px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <button type="button" onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          <button type="button" onClick={del} className="btn-danger text-sm">
            Hapus
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function BimbinganSheet({
  record,
  onClose,
}: {
  record: SkripsiBimbinganRecord | null;
  onClose: () => void;
}) {
  const userId = useAuth((s) => s.userId);
  const [date, setDate] = useState(record?.date ?? todayISO());
  const [dosen, setDosen] = useState(record?.dosen ?? "");
  const [topic, setTopic] = useState(record?.topic ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [todo, setTodo] = useState(record?.todo ?? "");

  async function save() {
    if (!userId) return;
    if (!topic.trim()) return;
    await upsertSkripsiBimbingan(userId, {
      id: record?.id,
      date,
      dosen,
      topic,
      notes,
      todo,
    });
    onClose();
  }

  async function del() {
    if (!userId || !record) return;
    if (!confirm("Hapus bimbingan ini?")) return;
    await deleteSkripsiBimbingan(userId, record.id);
    onClose();
  }

  return (
    <Sheet title={record ? "Edit bimbingan" : "Tambah bimbingan"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Tanggal">
          <input
            type="date"
            className="input-base"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Topik">
          <input
            className="input-base"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="misal: Revisi BAB II"
          />
        </Field>
        <Field label="Dosen">
          <input
            className="input-base"
            value={dosen}
            onChange={(e) => setDosen(e.target.value)}
          />
        </Field>
        <Field label="Catatan bimbingan">
          <textarea
            className="input-base min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <Field label="TODO sebelum bimbingan berikutnya">
          <textarea
            className="input-base min-h-[60px]"
            value={todo}
            onChange={(e) => setTodo(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <button type="button" onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button type="button" onClick={del} className="btn-danger text-sm">
              Hapus
            </button>
          )}
        </div>
      </div>
    </Sheet>
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
      <div className="mb-1 text-[12px] font-bold section-label text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}
