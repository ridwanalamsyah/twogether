"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame, Lock, MessageCircleQuestion } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/stores/auth";
import { upsertEntry, useEntries } from "@/stores/data";
import { usePeople } from "@/lib/people";
import { useNick } from "@/lib/nick";
import { addDays, isoDay } from "@/lib/dates";
import { parsePayload } from "@/lib/payload";
import { questionFor } from "@/lib/questions";
import { hapticSuccess, hapticTap } from "@/lib/haptic";

const KIND = "tanya";

/**
 * Pertanyaan hari ini: both answer the same question; the partner's answer
 * stays covered until you've written yours, so neither copies the other.
 * (The covering is in the app only: both answers sync like any entry.)
 */
export function DailyQuestionWidget() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const { nick } = useNick();
  const loaded = useEntries(userId, KIND);
  const entries = useMemo(() => loaded ?? [], [loaded]);
  const today = isoDay();
  const q = questionFor(today);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const reduce = useReducedMotion();

  const answerOf = (who: string | null, day = today) => {
    if (!who) return null;
    const e = entries.find((x) => x.date === day && x.who === who);
    return e ? { id: e.id, text: parsePayload(e.payload, { answer: "" }).answer } : null;
  };
  const mine = answerOf(me);
  const theirs = answerOf(partner);
  const partnerName = partner ? nick(partner) : "Pasanganmu";

  // Days in a row where both of you answered (today counts once both have).
  const streak = useMemo(() => {
    if (!partner) return 0;
    const both = (d: string) =>
      entries.some((x) => x.date === d && x.who === me) && entries.some((x) => x.date === d && x.who === partner);
    let day = both(today) ? today : addDays(today, -1);
    let n = 0;
    while (both(day)) {
      n++;
      day = addDays(day, -1);
    }
    return n;
  }, [entries, me, partner, today]);

  async function save() {
    const answer = draft.trim();
    if (!userId || !answer) return;
    hapticTap();
    await upsertEntry(userId, {
      id: mine?.id,
      kind: KIND,
      date: today,
      who: me,
      valueNum: q.index,
      payload: JSON.stringify({ answer: answer.slice(0, 500) }),
    });
    hapticSuccess();
    setDraft("");
    setEditing(false);
    setComposerOpen(false);
  }

  function openComposer() {
    hapticTap();
    setComposerOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }

  const showForm = editing || (!mine && composerOpen);

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-text-3">
          <MessageCircleQuestion size={15} aria-hidden />
          Pertanyaan hari ini
        </div>
        {streak > 1 && (
          <div className="flex items-center gap-1 text-[12px] font-semibold text-text-2">
            <Flame size={14} className="text-accent" aria-hidden />
            {streak} hari beruntun
          </div>
        )}
      </div>
      <p className="mt-2 text-[17px] font-bold leading-snug text-text-1">{q.text}</p>

      <AnimatePresence mode="wait" initial={false}>
        {showForm ? (
          <motion.div
            key="composer"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0.04 : 0.18 }}
            className="mt-3"
          >
            <label htmlFor="daily-q-input" className="sr-only">
              Jawaban pertanyaan hari ini
            </label>
            <textarea
              id="daily-q-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tulis jawabanmu…"
              rows={2}
              maxLength={500}
              className="input-base w-full resize-none text-[14px]"
            />
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setComposerOpen(false);
                }}
                className="min-h-[44px] rounded-[14px] px-3 text-[13px] font-medium text-text-3 active:opacity-60"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!draft.trim()}
                className="btn-accent min-h-[44px] shrink-0 px-5 py-2 text-[13px] disabled:opacity-40"
              >
                Kirim
              </button>
            </div>
          </motion.div>
        ) : !mine ? (
          <motion.div
            key="prompt"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: reduce ? 0.04 : 0.15 }}
            className="mt-3 flex items-center justify-between gap-3"
          >
            <span className="truncate text-[12px] text-text-3">
              {theirs
                ? `${partnerName} sudah jawab`
                : partner
                  ? "Terlihat setelah kalian menjawab"
                  : "Catat jawabanmu hari ini"}
            </span>
            <button
              type="button"
              onClick={openComposer}
              className="btn-accent min-h-[44px] shrink-0 px-5 py-2 text-[13px]"
            >
              Jawab
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="answers"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 space-y-2"
          >
            <Answer
              who="Kamu"
              text={mine.text}
              onEdit={() => {
                setDraft(mine.text);
                setEditing(true);
                window.setTimeout(() => inputRef.current?.focus(), 60);
              }}
            />
            <AnimatePresence mode="wait">
              {theirs ? (
                <motion.div
                  key="theirs"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(8px)", y: 6 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={reduce ? { duration: 0.08 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Answer who={partnerName} text={theirs.text} />
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-xl bg-bg-elev1 px-3 py-2.5 text-[13px] text-text-3"
                >
                  <Lock size={14} aria-hidden />
                  {partner ? `Menunggu jawaban ${partnerName}` : "Ajak pasangan untuk saling jawab"}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Answer({ who, text, onEdit }: { who: string; text: string; onEdit?: () => void }) {
  return (
    <div className="rounded-xl bg-bg-elev1 px-3 py-2.5">
      <div className="flex items-center justify-between text-[12px] font-semibold text-text-3">
        <span>{who}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[44px] -my-2 px-2 font-medium text-text-3 active:opacity-60"
          >
            Ubah
          </button>
        )}
      </div>
      <p className="mt-0.5 whitespace-pre-wrap text-[14px] text-text-1">{text}</p>
    </div>
  );
}
