"use client";

import { MapPin, Mic } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { placeOf, plainTags, summarizePlaces, withPlace } from "@/lib/places";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Sheet } from "@/components/ui/Sheet";
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
import { useMediaSrc } from "@/services/media";

export default function MomentsPage() {
  const userId = useAuth((s) => s.userId);
  const moments = useMoments(userId);
  const [showAdd, setShowAdd] = useState(false);
  const [tagPick, setActiveTag] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (moments ?? []).forEach((m) => plainTags(m.tags).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [moments]);
  // Drop the filter once its last moment is deleted or untagged.
  const activeTag = tagPick && allTags.includes(tagPick) ? tagPick : null;

  const filtered = useMemo(() => {
    if (!activeTag) return moments ?? [];
    return (moments ?? []).filter((m) => m.tags?.includes(activeTag));
  }, [moments, activeTag]);

  return (
    <div className="animate-in">
      <AppHeader
        title="Moments"
        actions={
          <div className="flex items-center gap-1.5">
            <Link
              href="/moments/tempat"
              aria-label="Tempat kita"
              className="grid h-11 w-11 place-items-center rounded-md bg-bg-elev2 text-text-2"
            >
              <MapPin size={16} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="min-h-[44px] rounded-md bg-accent px-3.5 py-2 text-[12px] font-medium text-accent-fg"
            >
              Tulis
            </button>
          </div>
        }
      />

      {allTags.length > 0 && (
        <div role="tablist" aria-label="Filter tag momen" className="flex gap-3 overflow-x-auto px-5 pt-2 text-[12px] no-scrollbar">
          <button
            type="button"
            role="tab"
            aria-selected={!activeTag}
            onClick={() => setActiveTag(null)}
            className={`relative flex-shrink-0 min-h-[44px] pb-2 font-medium transition-colors ${
              !activeTag ? "text-text-1" : "text-text-4"
            }`}
          >
            Semua
            {!activeTag && (
              <motion.span
                layoutId="moments-tag-underline"
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-text-1"
              />
            )}
          </button>
          {allTags.map((t) => {
            const on = t === activeTag;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={on}
                key={t}
                onClick={() => setActiveTag(on ? null : t)}
                className={`relative flex-shrink-0 min-h-[44px] pb-2 font-medium transition-colors ${
                  on ? "text-text-1" : "text-text-4"
                }`}
              >
                #{t}
                {on && (
                  <motion.span
                    layoutId="moments-tag-underline"
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-text-1"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3 px-5 pt-4 pb-6">
        {(moments ?? []).length === 0 ? (
          <EmptyState
            emoji="💌"
            title="Mulai dari satu momen"
            body="Catat hal kecil hari ini, baik kalimat singkat atau rekaman suara."
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

      <AnimatePresence>
        {showAdd && <AddMomentSheet key="add-moment" onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}

function MomentCard({ moment }: { moment: MomentRecord }) {
  const userId = useAuth((s) => s.userId);
  const [body, setBody] = useState<string>("");
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

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
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="min-h-[44px] flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {moment.emoji && <span className="text-base">{moment.emoji}</span>}
            <span className="text-[15px] font-medium text-text-1">
              {moment.title}
            </span>
            {moment.encrypted ? (
              <span className="ml-1 rounded-full bg-bg-elev2 px-2 py-0.5 text-[12px] font-bold text-text-3">
                Pribadi
              </span>
            ) : null}
            {moment.voice && <Mic size={13} className="text-text-3" aria-hidden="true" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-text-3">
            <span>{formatDateShort(moment.date)}</span>
            {placeOf(moment.tags) && (
              <span className="flex items-center gap-0.5 text-text-2">
                <MapPin size={12} aria-hidden="true" /> {placeOf(moment.tags)}
              </span>
            )}
            {plainTags(moment.tags).map((t) => (
              <span
                key={t}
                className="rounded-full bg-bg-elev2 px-2 py-0.5 text-[12px] font-semibold text-text-2"
              >
                #{t}
              </span>
            ))}
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            if (userId && confirm("Hapus moment ini?")) void deleteMoment(userId, moment.id);
          }}
          className="min-h-[44px] px-2 text-[12px] font-semibold text-[color:var(--negative)] hover:underline"
        >
          Hapus
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 space-y-2"
          >
            {body && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                {body}
              </p>
            )}
            {moment.voice && (
              <VoicePlayer src={moment.voice} />
            )}
            {!body && !moment.voice && (
              <p className="text-sm italic text-text-3">Belum ada isi.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
  const moments = useMoments(userId);
  const knownPlaces = useMemo(() => summarizePlaces(moments ?? []).map((p) => p.name), [moments]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("💌");
  const [tags, setTags] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [voice, setVoice] = useState<string | undefined>(undefined);
  const [encrypt, setEncrypt] = useState(false);
  const unlocked = isUnlocked();
  const canSubmit = Boolean(title.trim() || body.trim() || voice);

  async function submit() {
    if (!userId || !canSubmit) return;
    const cleanBody = body.trim();
    const cleanTitle = title.trim() || cleanBody.slice(0, 40) || (voice ? "Voice note" : "");
    await upsertMoment(
      userId,
      {
        title: cleanTitle,
        body: cleanBody,
        date: todayISO(),
        emoji,
        tags: withPlace(tags, place),
        voice,
      },
      { encrypt: encrypt && unlocked },
    );
    onClose();
  }

  return (
    <Sheet title="Moment baru" onClose={onClose}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <label htmlFor="moment-emoji" className="sr-only">
            Emoji momen
          </label>
          <input
            id="moment-emoji"
            className="input-base h-12 w-14 flex-shrink-0 text-center text-2xl"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            maxLength={2}
          />
          <label htmlFor="moment-title" className="sr-only">
            Judul momen
          </label>
          <input
            id="moment-title"
            className="input-base flex-1"
            placeholder="Judul moment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <label htmlFor="moment-body" className="sr-only">
          Cerita atau catatan
        </label>
        <textarea
          id="moment-body"
          className="input-base min-h-[100px] py-2 leading-relaxed"
          placeholder="Cerita atau catatan…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <VoiceRecorder value={voice} onChange={setVoice} />
        <label htmlFor="moment-place" className="flex min-h-[44px] items-center gap-2 rounded-md bg-bg-elev2 px-3 focus-within:ring-2 focus-within:ring-[color:var(--accent)]">
          <MapPin size={15} className="shrink-0 text-text-3" aria-hidden="true" />
          <input
            id="moment-place"
            className="min-h-[44px] min-w-0 flex-1 rounded bg-transparent text-sm placeholder:text-text-4"
            placeholder="Tempat (opsional), mis. Kopi Tuku Cipete"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            list="moment-places"
            maxLength={60}
          />
          <datalist id="moment-places">
            {knownPlaces.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={TAG_SUGGESTIONS}
        />
        <label className="flex min-h-[44px] items-center justify-between rounded-md bg-bg-elev2 px-3 py-2.5 text-sm theme-transition">
          <div>
            <div className="font-semibold">Pribadi</div>
            <div className="text-[12px] text-text-3">
              {unlocked
                ? "Isinya dienkripsi dan hanya kamu yang bisa membaca. Pasanganmu cuma melihat judulnya."
                : "Keluar lalu masuk lagi dengan password untuk bisa menulis momen pribadi."}
            </div>
          </div>
          <input
            type="checkbox"
            checked={encrypt && unlocked}
            disabled={!unlocked}
            onChange={(e) => setEncrypt(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn-accent w-full text-sm disabled:opacity-50"
        >
          Simpan moment
        </button>
      </div>
    </Sheet>
  );
}

/** Plays a voice note stored inline or in Storage ("sb:" link). */
function VoicePlayer({ src }: { src: string }) {
  const url = useMediaSrc(src);
  if (url === undefined) return <div className="skeleton h-9 w-full rounded-full" />;
  if (!url) return <div className="text-[12px] text-text-4">Rekaman belum sampai di HP ini.</div>;
  return <audio controls src={url} className="h-9 w-full" />;
}
