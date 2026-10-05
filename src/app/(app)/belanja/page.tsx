"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/stores/auth";
import { deleteItem, upsertItem, useItems } from "@/stores/data";
import { usePeople, parsePayload } from "@/lib/people";
import { hasRemoteSync } from "@/lib/supabase";
import { todayISO } from "@/lib/utils";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import type { ItemRecord } from "@/lib/db";

/**
 * Shared shopping list. Uses the same "shopping" items as Rumah → Belanja,
 * so both screens stay in step; changes reach the partner's phone within
 * seconds through realtime sync.
 */
export default function BelanjaPage() {
  const userId = useAuth((s) => s.userId);
  const { me, partner } = usePeople();
  const items = useItems(userId, "shopping") ?? [];
  const [text, setText] = useState("");
  const [showDone, setShowDone] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  const todo = items
    .filter((i) => i.status !== "done")
    .sort((a, b) => b.createdAt - a.createdAt);
  const done = items
    .filter((i) => i.status === "done")
    .sort((a, b) => b.updatedAt - a.updatedAt);

  // Things you buy often → one-tap re-add.
  const usual = useMemo(() => {
    const open = new Set(todo.map((i) => i.title.toLowerCase()));
    const counts = new Map<string, number>();
    for (const i of done) {
      const k = i.title.trim();
      if (!open.has(k.toLowerCase())) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);
  }, [todo, done]);

  async function add(title = text) {
    const t = title.trim();
    if (!userId || !t) return;
    const again = done.find((d) => d.title.toLowerCase() === t.toLowerCase());
    if (again) {
      await upsertItem(userId, { ...again, status: "todo", date: undefined, who: me });
    } else {
      await upsertItem(userId, {
        kind: "shopping",
        title: t,
        status: "todo",
        who: me,
        payload: JSON.stringify({ where: "", price: 0 }),
      });
    }
    setText("");
    hapticTap();
    input.current?.focus();
  }

  async function toggle(i: ItemRecord) {
    if (!userId) return;
    const toDone = i.status !== "done";
    await upsertItem(userId, { ...i, status: toDone ? "done" : "todo", date: toDone ? todayISO() : undefined });
    if (toDone) hapticSuccess();
    else hapticTap();
  }

  async function clearDone() {
    if (!userId) return;
    for (const i of done) await deleteItem(userId, i.id);
  }

  return (
    <div>
      <AppHeader title="Belanja bareng" />
      <div className="px-5 pb-10 pt-3">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-text-3">
          <span className={`h-2 w-2 rounded-full ${hasRemoteSync() ? "animate-pulse bg-[color:var(--positive)]" : "bg-text-5"}`} />
          {hasRemoteSync()
            ? `Langsung muncul di HP ${partner ?? "pasanganmu"}`
            : "Tersimpan di HP ini"}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="flex gap-2"
        >
          <input
            ref={input}
            className="input-base h-12 flex-1 text-[16px]"
            placeholder="Tambah barang… (mis. 2 telur)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="done"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="grid h-12 w-12 place-items-center rounded-full text-[22px] font-bold text-accent-fg shadow-[0_8px_18px_-10px_var(--accent)] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
            aria-label="Tambah"
          >
            +
          </button>
        </form>

        {usual.length > 0 && (
          <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
            {usual.map((u) => (
              <button
                key={u}
                onClick={() => add(u)}
                className="shrink-0 rounded-full bg-bg-card px-3 py-1.5 text-[13px] text-text-2 shadow-card active:scale-95"
              >
                + {u}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 mb-2 flex items-baseline justify-between">
          <span className="text-[16px] font-extrabold text-text-1">Perlu dibeli</span>
          <span className="text-[13px] text-text-3">{todo.length} barang</span>
        </div>
        {todo.length === 0 ? (
          <div className="rounded-[20px] border-2 border-dashed border-border py-10 text-center text-[14px] text-text-3">
            🛒 Daftar kosong. Ketik di atas untuk menambah.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[20px] bg-bg-card shadow-card">
            {todo.map((i) => (
              <Row key={i.id} item={i} me={me} onToggle={() => toggle(i)} onDelete={() => userId && deleteItem(userId, i.id)} />
            ))}
          </ul>
        )}

        {done.length > 0 && (
          <>
            <div className="mt-6 mb-2 flex items-center justify-between">
              <button onClick={() => setShowDone((v) => !v)} className="text-[14px] font-bold text-text-2">
                Sudah di keranjang ({done.length}) {showDone ? "▾" : "▸"}
              </button>
              <button onClick={clearDone} className="text-[12px] font-semibold text-text-3">
                Bersihkan
              </button>
            </div>
            {showDone && (
              <ul className="overflow-hidden rounded-[20px] bg-bg-card opacity-80 shadow-card">
                {done.map((i) => (
                  <Row key={i.id} item={i} me={me} onToggle={() => toggle(i)} onDelete={() => userId && deleteItem(userId, i.id)} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  item,
  me,
  onToggle,
  onDelete,
}: {
  item: ItemRecord;
  me: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isDone = item.status === "done";
  const p = parsePayload(item.payload, { where: "", price: 0 });
  return (
    <li className="border-b border-border last:border-0">
      <SwipeRow onDelete={onDelete}>
        <button onClick={onToggle} className="flex w-full items-center gap-3 bg-bg-card px-4 py-3.5 text-left">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[14px] font-bold transition-all ${
              isDone ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-border-strong text-transparent"
            }`}
          >
            ✓
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[16px] ${isDone ? "text-text-4 line-through" : "text-text-1"}`}>
              {item.title}
            </span>
            {(item.who && item.who !== me) || p.where ? (
              <span className="block text-[12px] text-text-4">
                {item.who && item.who !== me ? `dari ${item.who}` : ""}
                {item.who && item.who !== me && p.where ? " · " : ""}
                {p.where}
              </span>
            ) : null}
          </span>
        </button>
      </SwipeRow>
    </li>
  );
}
