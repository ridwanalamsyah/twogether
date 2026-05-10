"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import {
  deleteMoment,
  readMomentBody,
  upsertMoment,
  useMoments,
} from "@/stores/data";
import { formatDateShort, todayISO } from "@/lib/utils";
import { isUnlocked } from "@/lib/crypto";
import type { MomentRecord } from "@/lib/db";
import { TagInput } from "@/components/ui/TagInput";
import { VoiceRecorder } from "@/components/ui/VoiceRecorder";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MomentsPage() {
  const userId = useAuth((s) => s.userId);
  const moments = useMoments(userId);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (moments ?? []).forEach((m) => m.tags?.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [moments]);

  const filtered = useMemo(() => {
    if (!activeTag) return moments ?? [];
    return (moments ?? []).filter((m) => m.tags?.includes(activeTag));
  }, [moments, activeTag]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Moments"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg"
          >
            Tulis
          </button>
        }
      />

      {allTags.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-5 pt-3 text-xs no-scrollbar">
          <button
            onClick={() => setActiveTag(null)}
            className={`flex-shrink-0 -mb-px border-b pb-2 font-medium transition-colors ${
              !activeTag
                ? "border-text-1 text-text-1"
                : "border-transparent text-text-4"
            }`}
          >
            Semua
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={`flex-shrink-0 -mb-px border-b pb-2 font-medium transition-colors ${
                t === activeTag
                  ? "border-text-1 text-text-1"
                  : "border-transparent text-text-4"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 px-5 pt-4 pb-6">
        {(moments ?? []).length === 0 ? (
          <EmptyState
            emoji="💌"
            title="Mulai dari satu momen"
            body="Catat hal kecil hari ini — kalimat singkat, rekaman suara, atau emoji aja juga oke."
            cta="Tulis moment pertama"
            onCta={() => setShowAdd(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            emoji="🔎"
            title="Belum ada moment dengan tag ini"
            body={`Belum ada catatan dengan tag #${activeTag}.`}
          />
        ) : null}
        {filtered.map((m) => (
          <MomentCard key={m.id} moment={m} />
        ))}
      </div>

      {showAdd && <AddMomentSheet onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function MomentCard({ moment }: { moment: MomentRecord }) {
  const userId = useAuth((s) => s.userId);
  const [body, setBody] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    void readMomentBody(moment).then((b) => {
      if (mounted) setBody(b);
    });
    return () => {
      mounted = false;
    };
  }, [open, moment]);

  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {moment.emoji && <span className="text-base">{moment.emoji}</span>}
            <span className="text-[15px] font-medium text-text-1">
              {moment.title}
            </span>
            {moment.encrypted ? (
              <span className="ml-1 rounded-full bg-bg-elev2 px-2 py-0.5 text-[10px] font-bold text-text-3">
                🔒 E2E
              </span>
            ) : null}
            {moment.voice && <span className="text-xs">🎤</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-3">
            <span>{formatDateShort(moment.date)}</span>
            {(moment.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-bg-elev2 px-1.5 py-0.5 text-[10px] font-semibold text-text-2"
              >
                #{t}
              </span>
            ))}
          </div>
        </button>
        <button
          onClick={() => userId && deleteMoment(userId, moment.id)}
          className="text-xs font-semibold text-[color:var(--negative)] hover:underline"
        >
          Hapus
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 slide-up">
          {body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-2">
              {body}
            </p>
          )}
          {moment.voice && (
            <audio controls src={moment.voice} className="h-9 w-full" />
          )}
          {!body && !moment.voice && (
            <p className="text-sm italic text-text-3">— kosong —</p>
          )}
        </div>
      )}
    </div>
  );
}

const TAG_SUGGESTIONS = [
  "berdua",
  "jalan",
  "makan",
  "rumah",
  "kantor",
  "kampus",
  "milestone",
  "syukur",
];

function AddMomentSheet({ onClose }: { onClose: () => void }) {
  const userId = useAuth((s) => s.userId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("💌");
  const [tags, setTags] = useState<string[]>([]);
  const [voice, setVoice] = useState<string | undefined>(undefined);
  const [encrypt, setEncrypt] = useState(false);
  const unlocked = isUnlocked();

  async function submit() {
    if (!userId || !title.trim()) return;
    await upsertMoment(
      userId,
      {
        title: title.trim(),
        body,
        date: todayISO(),
        emoji,
        tags,
        voice,
      },
      { encrypt: encrypt && unlocked },
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40">
      <div className="mx-auto w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-t-[20px] bg-bg-app p-5 pb-[calc(96px+var(--sab))] slide-up theme-transition">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg-elev3" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Moment baru</h2>
          <button onClick={onClose} className="text-xl text-text-3">
            ×
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input-base h-12 w-14 flex-shrink-0 text-center text-2xl"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              maxLength={2}
            />
            <input
              className="input-base flex-1"
              placeholder="Judul moment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <textarea
            className="input-base min-h-[100px] py-2 leading-relaxed"
            placeholder="Cerita atau catatan…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <VoiceRecorder value={voice} onChange={setVoice} />
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={TAG_SUGGESTIONS}
          />
          <label className="flex items-center justify-between rounded-md bg-bg-elev2 px-3 py-2.5 text-sm theme-transition">
            <div>
              <div className="font-semibold">Enkripsi end-to-end</div>
              <div className="text-[11px] text-text-3">
                {unlocked
                  ? "Catatan akan dienkripsi dengan kunci dari password kamu."
                  : "Masuk ulang untuk membuka kunci enkripsi."}
              </div>
            </div>
            <input
              type="checkbox"
              checked={encrypt && unlocked}
              disabled={!unlocked}
              onChange={(e) => setEncrypt(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent)]"
            />
          </label>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="btn-accent w-full text-sm disabled:opacity-50"
          >
            Simpan moment
          </button>
        </div>
      </div>
    </div>
  );
}
