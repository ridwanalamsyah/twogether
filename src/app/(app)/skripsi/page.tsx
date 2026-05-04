"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
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
          <span className="font-mono text-[28px] font-semibold tracking-tight text-text-1">
            {overall}%
          </span>
          <span className="text-[11px] text-text-3">
            {(chapters ?? []).length} BAB · {(bimbingan ?? []).length} bimbingan
          </span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bg-elev2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>

        <div className="mt-5 flex gap-5 border-b border-border text-xs">
          {(
            [
              { id: "bab", label: "BAB" },
              { id: "bimbingan", label: "Bimbingan" },
              { id: "meta", label: "Info" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b pb-2 font-medium transition-colors ${
                tab === t.id
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-4"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-3">

        {tab === "bab" && (
          <div className="space-y-2">
          {/* keep existing */}
            {(chapters ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setEditChapter(c)}
                className="surface block w-full p-3 text-left theme-transition active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-3">
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
                  <div className="font-mono text-sm font-bold">
                    {c.progress}%
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elev3">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-text-2">{c.status}</span>
                  {c.note && (
                    <span className="truncate text-text-3">📝 {c.note}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "bimbingan" && (
          <div className="space-y-2">
            <button
              onClick={() => setShowAddBimbingan(true)}
              className="btn-soft w-full text-sm"
            >
              + Tambah bimbingan
            </button>
            {(bimbingan ?? []).length === 0 ? (
              <EmptyState
                emoji="📝"
                title="Belum ada bimbingan tercatat"
                body="Catat jadwal & arahan dosen di sini supaya nggak lupa revisi yang dimaksud."
              />
            ) : (
              (bimbingan ?? []).map((b) => (
                <button
                  key={b.id}
                  onClick={() => setEditBimbingan(b)}
                  className="surface block w-full p-3 text-left theme-transition"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold text-text-1">{b.topic}</div>
                    <div className="text-[11px] text-text-3">
                      {formatDateShort(b.date)}
                    </div>
                  </div>
                  {b.dosen && (
                    <div className="mt-0.5 text-xs text-text-2">
                      👨‍🏫 {b.dosen}
                    </div>
                  )}
                  {b.notes && (
                    <div className="mt-1 line-clamp-2 text-xs text-text-3">
                      {b.notes}
                    </div>
                  )}
                  {b.todo && (
                    <div className="mt-1 rounded bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent">
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

      {editChapter && (
        <ChapterSheet
          chapter={editChapter}
          onClose={() => setEditChapter(null)}
        />
      )}
      {(showAddBimbingan || editBimbingan) && (
        <BimbinganSheet
          record={editBimbingan}
          onClose={() => {
            setShowAddBimbingan(false);
            setEditBimbingan(null);
          }}
        />
      )}
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
      <button onClick={save} className="btn-accent w-full text-sm">
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
            className="w-full"
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
          <button onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          <button onClick={del} className="btn-danger text-sm">
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
          <button onClick={save} className="btn-accent flex-1 text-sm">
            Simpan
          </button>
          {record && (
            <button onClick={del} className="btn-danger text-sm">
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
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-3">
        {label}
      </div>
      {children}
    </label>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(20px+var(--sab))] slide-up theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
