import { newId, type ItemRecord } from "@/lib/db";
import { parsePayload } from "@/lib/people";

export type BlockType = "p" | "h1" | "h2" | "todo" | "bullet" | "quote" | "divider" | "page" | "image" | "file";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  /** For type "page": the linked sub-page id. */
  pageId?: string;
  /** For "image" / "file": id of the `note-file` item holding the data. */
  fileId?: string;
  fileName?: string;
  fileSize?: number;
}

/** Blocks that aren't typed into (no textarea of their own text flow). */
export function isEmbed(b: Block): boolean {
  return b.type === "divider" || b.type === "page" || b.type === "image" || b.type === "file";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface NotePayload {
  emoji: string;
  parentId: string | null;
  blocks: Block[];
}

export const EMPTY_NOTE: NotePayload = { emoji: "📝", parentId: null, blocks: [] };

export function readNote(item: ItemRecord): NotePayload {
  const p = parsePayload<NotePayload>(item.payload, EMPTY_NOTE);
  return { ...p, blocks: Array.isArray(p.blocks) ? p.blocks : [] };
}

export function block(type: BlockType = "p", text = ""): Block {
  return { id: newId(), type, text, ...(type === "todo" ? { checked: false } : {}) };
}

/** Markdown-style shortcuts typed at the start of a block. */
export function shortcut(text: string): { type: BlockType; text: string } | null {
  if (text === "---") return { type: "divider", text: "" };
  const rules: [RegExp, BlockType][] = [
    [/^#\s/, "h1"],
    [/^##\s/, "h2"],
    [/^[-*•]\s/, "bullet"],
    [/^\[\s?\]\s/, "todo"],
    [/^>\s/, "quote"],
  ];
  // "## " must win over "# ".
  if (/^##\s/.test(text)) return { type: "h2", text: text.replace(/^##\s/, "") };
  for (const [re, type] of rules) {
    if (re.test(text)) return { type, text: text.replace(re, "") };
  }
  return null;
}

/** Plain-text preview for lists & search. */
export function preview(blocks: Block[]): string {
  return blocks
    .filter((b) => b.type !== "divider" && b.type !== "page" && b.text.trim())
    .map((b) => b.text.trim())
    .join(" · ")
    .slice(0, 120);
}

export const NOTE_TEMPLATES: { title: string; emoji: string; blocks: Block[] }[] = [
  {
    title: "Rencana minggu ini",
    emoji: "🗓️",
    blocks: [
      block("h2", "Target minggu ini"),
      block("todo", ""),
      block("h2", "Jadwal penting"),
      block("bullet", ""),
      block("h2", "Catatan"),
      block("p", ""),
    ],
  },
  {
    title: "Ide date",
    emoji: "💡",
    blocks: [
      block("h2", "Murah meriah"),
      block("bullet", "Piknik di taman"),
      block("bullet", "Masak bareng"),
      block("h2", "Spesial"),
      block("bullet", ""),
    ],
  },
  {
    title: "Catatan diskusi",
    emoji: "💬",
    blocks: [
      block("h2", "Yang dibahas"),
      block("bullet", ""),
      block("h2", "Keputusan"),
      block("todo", ""),
    ],
  },
];

export const NOTE_EMOJIS = ["📝", "💡", "🗓️", "💬", "📚", "🎯", "🏠", "✈️", "💰", "❤️", "🌱", "🛒", "🎁", "⭐", "📌", "🧠"];
