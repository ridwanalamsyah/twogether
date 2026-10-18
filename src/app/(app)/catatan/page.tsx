"use client";

import { useNick } from "@/lib/nick";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { upsertItem, useItems } from "@/stores/data";
import {
  NOTE_TEMPLATES,
  block,
  preview,
  readNote,
  type NotePayload,
} from "@/lib/notes";
import { newId } from "@/lib/db";
import { usePeople } from "@/lib/people";
import { Editor } from "@/components/notes/Editor";

export default function CatatanPage() {
  return (
    <Suspense fallback={null}>
      <Catatan />
    </Suspense>
  );
}

function Catatan() {
  const params = useSearchParams();
  const id = params.get("id");
  return id ? <Editor key={id} id={id} /> : <NoteList />;
}

/* ───────────────────────── List ───────────────────────── */

function NoteList() {
  const { nick } = useNick();
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const router = useRouter();
  const notes = useItems(userId, "note") ?? [];
  const [q, setQ] = useState("");

  const roots = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notes
      .filter((n) => (needle ? true : !readNote(n).parentId))
      .filter((n) =>
        needle
          ? `${n.title} ${preview(readNote(n).blocks)}`.toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, q]);

  async function create(tpl?: (typeof NOTE_TEMPLATES)[number]) {
    if (!userId) return;
    const payload: NotePayload = {
      emoji: tpl?.emoji ?? "📝",
      parentId: null,
      blocks: tpl ? tpl.blocks.map((b) => ({ ...b, id: newId() })) : [block("p")],
    };
    const rec = await upsertItem(userId, {
      kind: "note",
      title: tpl?.title ?? "",
      who: me,
      payload: JSON.stringify(payload),
    });
    router.push(`/catatan?id=${rec.id}`);
  }

  return (
    <div>
      <AppHeader
        title="Catatan"
        actions={
          <button
            onClick={() => create()}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
          >
            + Baru
          </button>
        }
      />
      <div className="px-5 pb-8 pt-3">
        <input
          type="search"
          className="input-base mb-4 h-10 text-[14px]"
          placeholder="Cari di semua catatan…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {roots.length === 0 && !q ? (
          <div className="space-y-3">
            <div className="rounded-[20px] bg-bg-elev1 px-6 py-8 text-center text-[14px] leading-relaxed text-text-3">
              Tempat menulis apa saja berdua — rencana, ide, daftar, catatan.
            </div>
            <div className="text-[13px] font-bold text-text-2">Mulai dari template</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {NOTE_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  onClick={() => create(t)}
                  className="pressable flex items-center gap-3 rounded-[18px] bg-bg-card p-4 text-left shadow-card"
                >
                  <span className="text-[24px]">{t.emoji}</span>
                  <span className="text-[14px] font-semibold text-text-1">{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {roots.map((n) => {
              const p = readNote(n);
              const kids = notes.filter((c) => readNote(c).parentId === n.id).length;
              return (
                <li key={n.id} className="slide-up">
                  <button
                    onClick={() => router.push(`/catatan?id=${n.id}`)}
                    className="pressable flex h-full w-full gap-3 rounded-[20px] bg-bg-card p-4 text-left shadow-card"
                  >
                    <span className="text-[26px] leading-none">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-text-1">
                        {n.title || "Tanpa judul"}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-text-3">
                        {preview(p.blocks) || "Kosong"}
                      </span>
                      <span className="mt-1.5 block text-[11px] text-text-4">
                        {n.who ? `${nick(n.who)} · ` : ""}
                        {new Date(n.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        {kids > 0 ? ` · ${kids} sub-halaman` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Editor ───────────────────────── */
