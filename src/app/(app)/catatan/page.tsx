"use client";

import { useNick } from "@/lib/nick";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { useAuth } from "@/stores/auth";
import { deleteItem, upsertItem, useItems } from "@/stores/data";
import {
  NOTE_EMOJIS,
  NOTE_TEMPLATES,
  block,
  preview,
  readNote,
  shortcut,
  isEmbed,
  type Block,
  type BlockType,
  type NotePayload,
} from "@/lib/notes";
import { newId, type ItemRecord } from "@/lib/db";
import { usePeople } from "@/lib/people";
import { hapticTap } from "@/lib/haptic";
import { FileView, ImageView, MAX_FILE_BYTES, saveAttachment } from "@/components/notes/Attachment";

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
            <div className="rounded-[20px] border-2 border-dashed border-border px-6 py-8 text-center text-[13px] text-text-3">
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

const TYPE_MENU: { type: BlockType; label: string; icon: string }[] = [
  { type: "p", label: "Teks", icon: "¶" },
  { type: "h1", label: "Judul besar", icon: "H1" },
  { type: "h2", label: "Judul", icon: "H2" },
  { type: "todo", label: "Checklist", icon: "☑" },
  { type: "bullet", label: "Poin", icon: "•" },
  { type: "quote", label: "Kutipan", icon: "❝" },
  { type: "divider", label: "Garis", icon: "—" },
  { type: "image", label: "Foto / file", icon: "🖼️" },
];

function Editor({ id }: { id: string }) {
  const userId = useAuth((s) => s.userId);
  const { me } = usePeople();
  const router = useRouter();
  const notes = useItems(userId, "note");
  const item = notes?.find((n) => n.id === id);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState<NotePayload | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [slashFor, setSlashFor] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const dirty = useRef(false);
  const lastSeen = useRef(0);
  const caretTo = useRef<{ id: string; pos: number | "end" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachAfter = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load, and pick up the partner's edits when we have nothing unsaved.
  useEffect(() => {
    if (!item) return;
    if (note && (dirty.current || item.updatedAt <= lastSeen.current)) return;
    lastSeen.current = item.updatedAt;
    const p = readNote(item);
    setTitle(item.title);
    setNote({ ...p, blocks: p.blocks.length ? p.blocks : [block("p")] });
  }, [item, note]);

  const save = useCallback(
    async (t: string, n: NotePayload) => {
      if (!userId || !item) return;
      const rec = await upsertItem(userId, {
        ...item,
        title: t.trim(),
        who: item.who || me,
        payload: JSON.stringify(n),
      });
      lastSeen.current = rec.updatedAt;
      dirty.current = false;
    },
    [userId, item, me],
  );

  // Debounced autosave.
  useEffect(() => {
    if (!note || !dirty.current) return;
    const t = setTimeout(() => void save(title, note), 500);
    return () => clearTimeout(t);
  }, [title, note, save]);

  // Flush on leave.
  const latest = useRef({ title, note });
  latest.current = { title, note };
  useEffect(
    () => () => {
      if (dirty.current && latest.current.note) void save(latest.current.title, latest.current.note);
    },
    [save],
  );

  function update(fn: (blocks: Block[]) => Block[]) {
    dirty.current = true;
    setNote((n) => (n ? { ...n, blocks: fn(n.blocks) } : n));
  }
  function patch(id: string, p: Partial<Block>) {
    update((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  }

  if (notes === undefined) return null;
  if (!item) {
    return (
      <div className="px-5 pt-16 text-center text-text-3">
        Catatan tidak ditemukan.{" "}
        <button className="font-semibold text-accent" onClick={() => router.replace("/catatan")}>
          Kembali
        </button>
      </div>
    );
  }
  if (!note) return null;

  const parent = note.parentId ? notes.find((n) => n.id === note.parentId) : null;
  const children = notes.filter((n) => readNote(n).parentId === id);

  async function addSubPage(afterId?: string) {
    if (!userId) return;
    const child = await upsertItem(userId, {
      kind: "note",
      title: "",
      who: me,
      payload: JSON.stringify({ emoji: "📄", parentId: id, blocks: [block("p")] } satisfies NotePayload),
    });
    const link: Block = { ...block("page"), pageId: child.id };
    const blocks = [...note!.blocks];
    const i = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
    blocks.splice(i + 1, 0, link);
    const next = { ...note!, blocks };
    setNote(next);
    await save(title, next);
    router.push(`/catatan?id=${child.id}`);
  }

  async function removePage() {
    if (!userId || !item) return;
    if (!confirm("Hapus catatan ini beserta sub-halamannya?")) return;
    const all = notes ?? [];
    const kill = (pid: string) => {
      for (const c of all.filter((n) => readNote(n).parentId === pid)) kill(c.id);
      const n = all.find((x) => x.id === pid);
      for (const b of n ? readNote(n).blocks : []) if (b.fileId) void deleteItem(userId, b.fileId);
      void deleteItem(userId, pid);
    };
    kill(item.id);
    dirty.current = false;
    router.replace(note?.parentId ? `/catatan?id=${note.parentId}` : "/catatan");
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>, b: Block, index: number) {
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    if (b.type === "image") {
      // Caption: Enter starts a new paragraph below; never turn the photo into text.
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const nb = block("p");
        update((bs) => {
          const next = [...bs];
          next.splice(index + 1, 0, nb);
          return next;
        });
        caretTo.current = { id: nb.id, pos: 0 };
        setFocusId(nb.id);
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashFor) return;
      // Enter on an empty list item ends the list.
      if (!b.text && (b.type === "todo" || b.type === "bullet" || b.type === "quote")) {
        patch(b.id, { type: "p" });
        return;
      }
      const before = b.text.slice(0, el.selectionStart);
      const after = b.text.slice(el.selectionEnd);
      const carry: BlockType = b.type === "todo" || b.type === "bullet" ? b.type : "p";
      const nb = block(carry, after);
      update((bs) => {
        const next = bs.map((x) => (x.id === b.id ? { ...x, text: before } : x));
        next.splice(index + 1, 0, nb);
        return next;
      });
      caretTo.current = { id: nb.id, pos: 0 };
      setFocusId(nb.id);
      return;
    }
    if (e.key === "Backspace" && atStart) {
      if (b.type !== "p") {
        e.preventDefault();
        patch(b.id, { type: "p" });
        return;
      }
      if (index > 0) {
        e.preventDefault();
        const prev = note!.blocks[index - 1];
        if (prev.type === "divider" || prev.type === "page") {
          update((bs) => bs.filter((x) => x.id !== prev.id));
          return;
        }
        if (isEmbed(prev)) return;
        const pos = prev.text.length;
        update((bs) => bs.filter((x) => x.id !== b.id).map((x) => (x.id === prev.id ? { ...x, text: x.text + b.text } : x)));
        caretTo.current = { id: prev.id, pos };
        setFocusId(prev.id);
      }
      return;
    }
    if (e.key === "ArrowUp" && atStart && index > 0) {
      const prev = note!.blocks.slice(0, index).reverse().find((x) => !isEmbed(x));
      if (prev) {
        e.preventDefault();
        caretTo.current = { id: prev.id, pos: "end" };
        setFocusId(prev.id);
      }
    }
    if (e.key === "Escape") setSlashFor(null);
  }

  function onChange(b: Block, value: string) {
    if (b.type === "image") return patch(b.id, { text: value });
    if (value === "/") setSlashFor(b.id);
    else if (slashFor === b.id) setSlashFor(null);
    const sc = b.type === "p" ? shortcut(value) : null;
    if (sc) {
      patch(b.id, { type: sc.type, text: sc.text, ...(sc.type === "todo" ? { checked: false } : {}) });
      if (sc.type === "divider") {
        const nb = block("p");
        update((bs) => {
          const i = bs.findIndex((x) => x.id === b.id);
          const next = [...bs];
          next.splice(i + 1, 0, nb);
          return next;
        });
        caretTo.current = { id: nb.id, pos: 0 };
        setFocusId(nb.id);
      }
      return;
    }
    patch(b.id, { text: value });
  }

  function setType(b: Block, type: BlockType) {
    setSlashFor(null);
    if (type === "image" || type === "file") {
      if (b.text === "/") patch(b.id, { text: "" });
      attachAfter.current = b.id;
      fileRef.current?.click();
      return;
    }
    if (type === "divider") {
      const nb = block("p");
      update((bs) => {
        const i = bs.findIndex((x) => x.id === b.id);
        const next = bs.map((x) => (x.id === b.id ? { ...x, type: "divider" as const, text: "" } : x));
        next.splice(i + 1, 0, nb);
        return next;
      });
      caretTo.current = { id: nb.id, pos: 0 };
      setFocusId(nb.id);
      return;
    }
    patch(b.id, { type, text: b.text === "/" ? "" : b.text, ...(type === "todo" ? { checked: false } : {}) });
    caretTo.current = { id: b.id, pos: "end" };
    setFocusId(b.id);
  }

  const focused = note.blocks.find((b) => b.id === focusId);

  async function attach(files: FileList) {
    if (!userId) return;
    setUploading(true);
    const added: Block[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/") && f.size > MAX_FILE_BYTES) {
        alert(`"${f.name}" terlalu besar. Maksimal 3 MB per file.`);
        continue;
      }
      try {
        const a = await saveAttachment(userId, id, f);
        added.push({ ...block(a.isImage ? "image" : "file"), fileId: a.id, fileName: a.name, fileSize: a.size });
      } catch {
        alert(`"${f.name}" tidak bisa dibuka.`);
      }
    }
    setUploading(false);
    if (!added.length) return;
    const after = attachAfter.current;
    attachAfter.current = null;
    update((bs) => {
      const next = [...bs];
      const i = after ? next.findIndex((x) => x.id === after) : next.length - 1;
      // Replace an empty paragraph we were typing in, otherwise insert after it.
      const target = next[i];
      if (target && target.type === "p" && !target.text) next.splice(i, 1, ...added);
      else next.splice(i + 1, 0, ...added);
      if (next[next.length - 1] && isEmbed(next[next.length - 1])) next.push(block("p"));
      return next;
    });
    hapticTap();
  }

  async function removeBlock(b: Block) {
    update((bs) => bs.filter((x) => x.id !== b.id));
    if (b.fileId && userId) await deleteItem(userId, b.fileId);
  }

  return (
    <div>
      <AppHeader
        title={parent ? `${readNote(parent).emoji} ${parent.title || "Tanpa judul"}` : "Catatan"}
        actions={
          <>
            <button
              onClick={() => router.push(parent ? `/catatan?id=${parent.id}` : "/catatan")}
              className="rounded-full bg-bg-elev2 px-3 py-1.5 text-xs font-semibold text-text-2"
            >
              ‹ Kembali
            </button>
            <button onClick={removePage} className="rounded-full px-2 py-1.5 text-xs font-semibold text-[color:var(--negative)]">
              Hapus
            </button>
          </>
        }
      />
      <article className="mx-auto max-w-[760px] px-5 pb-40 pt-4">
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="text-[44px] leading-none transition-transform active:scale-90"
            aria-label="Ganti ikon"
          >
            {note.emoji}
          </button>
          {showEmoji && (
            <div className="pop-in absolute left-0 top-14 z-20 grid w-[264px] grid-cols-8 gap-1 rounded-2xl bg-bg-card p-2 shadow-float">
              {NOTE_EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    dirty.current = true;
                    setNote({ ...note, emoji: em });
                    setShowEmoji(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[20px] hover:bg-bg-elev1"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>
        <AutoText
          value={title}
          onChange={(v) => {
            dirty.current = true;
            setTitle(v);
          }}
          placeholder="Tanpa judul"
          className="mt-2 w-full text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-text-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = note.blocks[0];
              if (first) {
                caretTo.current = { id: first.id, pos: 0 };
                setFocusId(first.id);
              }
            }
          }}
        />

        <div className="mt-3 space-y-0.5">
          {note.blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              b={b}
              index={i}
              number={b.type === "bullet" ? 0 : 0}
              focus={focusId === b.id}
              caret={caretTo.current?.id === b.id ? caretTo.current.pos : null}
              onCaretDone={() => (caretTo.current = null)}
              onFocus={() => setFocusId(b.id)}
              onChange={(v) => onChange(b, v)}
              onKey={(e) => onKey(e, b, i)}
              onToggle={() => {
                patch(b.id, { checked: !b.checked });
                hapticTap();
              }}
              onOpenPage={() => b.pageId && router.push(`/catatan?id=${b.pageId}`)}
              pageTitle={
                b.pageId
                  ? (() => {
                      const c = notes.find((n) => n.id === b.pageId);
                      return c ? `${readNote(c).emoji} ${c.title || "Tanpa judul"}` : null;
                    })()
                  : null
              }
              onRemove={() => void removeBlock(b)}
              slashOpen={slashFor === b.id}
              onPickType={(t) => setType(b, t)}
            />
          ))}
        </div>

        <button
          onClick={() => {
            const nb = block("p");
            update((bs) => [...bs, nb]);
            caretTo.current = { id: nb.id, pos: 0 };
            setFocusId(nb.id);
          }}
          className="mt-2 w-full rounded-xl py-3 text-left text-[14px] text-text-4 hover:bg-bg-elev1"
        >
          + Tulis di sini…
        </button>

        {children.filter((c) => !note.blocks.some((b) => b.pageId === c.id)).length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-[12px] font-bold text-text-3">Sub-halaman</div>
            {children
              .filter((c) => !note.blocks.some((b) => b.pageId === c.id))
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/catatan?id=${c.id}`)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[15px] text-text-1 hover:bg-bg-elev1"
                >
                  {readNote(c).emoji} <span className="underline decoration-border-strong underline-offset-4">{c.title || "Tanpa judul"}</span>
                </button>
              ))}
          </div>
        )}
      </article>

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        onChange={(e) => {
          if (e.target.files?.length) void attach(e.target.files);
          e.target.value = "";
        }}
      />
      {/* Formatting bar (sits above the keyboard on phones) */}
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--sab)+8px)] z-30 mx-auto flex max-w-[480px] justify-center px-3 md:bottom-6 md:left-[var(--sidebar-w)] md:max-w-none">
        <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-bg-card p-1.5 shadow-float">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              attachAfter.current = focused?.id ?? null;
              fileRef.current?.click();
            }}
            disabled={uploading}
            className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-text-2 disabled:opacity-40"
          >
            {uploading ? "Mengunggah…" : "🖼️ Foto"}
          </button>
          {TYPE_MENU.filter((t) => t.type !== "divider" && t.type !== "image").map((t) => (
            <button
              key={t.type}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => focused && setType(focused, t.type)}
              disabled={!focused}
              className={`h-9 min-w-9 shrink-0 rounded-full px-3 text-[13px] font-bold ${
                focused?.type === t.type ? "bg-accent text-accent-fg" : "text-text-2 disabled:opacity-40"
              }`}
              aria-label={t.label}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => addSubPage(focused?.id)}
            className="h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-text-2"
          >
            📄 Sub-halaman
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockRow({
  b,
  focus,
  caret,
  onCaretDone,
  onFocus,
  onChange,
  onKey,
  onToggle,
  onOpenPage,
  pageTitle,
  onRemove,
  slashOpen,
  onPickType,
}: {
  b: Block;
  index: number;
  number: number;
  focus: boolean;
  caret: number | "end" | null;
  onCaretDone: () => void;
  onFocus: () => void;
  onChange: (v: string) => void;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onToggle: () => void;
  onOpenPage: () => void;
  pageTitle: string | null;
  onRemove: () => void;
  slashOpen: boolean;
  onPickType: (t: BlockType) => void;
}) {
  if (b.type === "divider") {
    return (
      <div className="group flex items-center py-3">
        <hr className="flex-1 border-border-strong" />
        <button onClick={onRemove} className="ml-2 text-[12px] text-text-4 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          ✕
        </button>
      </div>
    );
  }
  if (b.type === "image") {
    return (
      <div className="py-2">
        <ImageView fileId={b.fileId} onRemove={onRemove} />
        <AutoText
          value={b.text}
          focus={focus}
          caret={caret}
          onCaretDone={onCaretDone}
          onFocus={onFocus}
          onChange={onChange}
          onKeyDown={onKey}
          placeholder="Keterangan foto…"
          className="mt-1 w-full text-center text-[13px] text-text-3"
        />
      </div>
    );
  }
  if (b.type === "file") {
    return (
      <div className="py-1.5">
        <FileView fileId={b.fileId} name={b.fileName} size={b.fileSize} onRemove={onRemove} />
      </div>
    );
  }
  if (b.type === "page") {
    return (
      <button onClick={onOpenPage} className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left text-[16px] text-text-1 hover:bg-bg-elev1">
        {pageTitle ? (
          <span className="underline decoration-border-strong underline-offset-4">{pageTitle}</span>
        ) : (
          <span className="text-text-4">Sub-halaman dihapus</span>
        )}
      </button>
    );
  }

  const style =
    b.type === "h1"
      ? "text-[24px] font-extrabold tracking-tight mt-4"
      : b.type === "h2"
        ? "text-[19px] font-bold tracking-tight mt-3"
        : b.type === "quote"
          ? "text-[16px] italic text-text-2"
          : "text-[16px]";

  return (
    <div className="relative">
      <div className={`flex items-start gap-2 ${b.type === "quote" ? "border-l-4 border-accent pl-3" : ""}`}>
        {b.type === "todo" && (
          <button
            onClick={onToggle}
            className={`mt-[5px] grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[12px] font-bold ${
              b.checked ? "border-accent bg-accent text-accent-fg" : "border-border-strong text-transparent"
            }`}
            aria-label={b.checked ? "Belum" : "Selesai"}
          >
            ✓
          </button>
        )}
        {b.type === "bullet" && <span className="mt-[2px] w-5 shrink-0 text-center text-[18px] leading-6 text-text-3">•</span>}
        <AutoText
          value={b.text}
          focus={focus}
          caret={caret}
          onCaretDone={onCaretDone}
          onFocus={onFocus}
          onChange={onChange}
          onKeyDown={onKey}
          placeholder={focus ? (b.type === "p" ? "Ketik, atau / untuk pilihan…" : b.type === "h1" || b.type === "h2" ? "Judul" : "Daftar") : ""}
          className={`w-full leading-relaxed text-text-1 ${style} ${b.type === "todo" && b.checked ? "text-text-4 line-through" : ""}`}
        />
      </div>
      {slashOpen && (
        <div className="pop-in absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-2xl bg-bg-card py-1 shadow-float">
          {TYPE_MENU.map((t) => (
            <button
              key={t.type}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPickType(t.type)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] text-text-1 hover:bg-bg-elev1"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-bg-elev1 text-[12px] font-bold">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Auto-growing borderless textarea. */
function AutoText({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className,
  focus,
  caret,
  onCaretDone,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  focus?: boolean;
  caret?: number | "end" | null;
  onCaretDone?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, className]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !focus || caret == null) return;
    el.focus();
    const pos = caret === "end" ? el.value.length : caret;
    el.setSelectionRange(pos, pos);
    onCaretDone?.();
  }, [focus, caret, onCaretDone]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={`resize-none overflow-hidden bg-transparent outline-none placeholder:text-text-5 ${className ?? ""}`}
    />
  );
}
