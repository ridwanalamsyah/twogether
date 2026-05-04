"use client";

import { useState } from "react";

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
  placeholder = "Tambah tag…",
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
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-bg-elev2 p-2">
        {value.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => remove(t)}
            className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg"
          >
            #{t} <span className="text-[10px] opacity-70">×</span>
          </button>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && commit(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="rounded-full bg-bg-elev2 px-2 py-0.5 text-[10px] text-text-3 hover:bg-bg-elev3"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
