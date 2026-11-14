"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Lightweight tag input. Type a tag, press Enter or comma to add it.
 * Backspace on empty input removes the last chip.
 *
 * Tags are normalized to lowercase, trimmed, deduped, and limited to 16
 * chars to keep IndexedDB rows compact.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Tambah tag...",
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const t = raw.trim().toLowerCase().slice(0, 16);
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  function remove(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => (draft ? s.includes(draft.toLowerCase()) : true))
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-bg-elev2 p-2 focus-within:border-accent">
        {value.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => remove(t)}
            aria-label={`Hapus tag ${t}`}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12px] font-semibold text-accent-fg"
          >
            <span>#{t}</span>
            <X size={12} aria-hidden className="opacity-80" />
          </button>
        ))}
        <input
          type="text"
          aria-label={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && commit(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-h-[44px] min-w-[80px] flex-1 rounded-lg bg-transparent px-1 text-sm text-text-1"
        />
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="min-h-[44px] rounded-full bg-bg-elev2 px-3.5 text-[12px] text-text-3 hover:bg-bg-elev3"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
