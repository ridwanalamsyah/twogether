"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/db";
import { upsertItem } from "@/stores/data";
import { parsePayload } from "@/lib/people";
import { compressImage, fileToDataUrl } from "@/lib/image";
import { formatBytes } from "@/lib/notes";

/**
 * Photos & files inside a note. The bytes live in their own `note-file` item
 * so the note itself stays small (it is re-saved on every keystroke).
 */

export const MAX_FILE_BYTES = 3 * 1024 * 1024;

interface FilePayload {
  noteId: string;
  mime: string;
  size: number;
  data: string;
}

export async function saveAttachment(
  userId: string,
  noteId: string,
  file: File,
): Promise<{ id: string; isImage: boolean; name: string; size: number }> {
  const isImage = file.type.startsWith("image/") && !file.type.includes("svg");
  if (!isImage && file.size > MAX_FILE_BYTES) throw new Error("too-big");
  const data = isImage ? await compressImage(file, 1600, 0.75) : await fileToDataUrl(file);
  const size = Math.round((data.length - data.indexOf(",") - 1) * 0.75);
  const rec = await upsertItem(userId, {
    kind: "note-file",
    title: file.name || (isImage ? "Foto" : "File"),
    payload: JSON.stringify({ noteId, mime: isImage ? "image/jpeg" : file.type, size, data } satisfies FilePayload),
  });
  return { id: rec.id, isImage, name: rec.title, size };
}

function useAttachment(id?: string) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const r = await getDB().items.get(id);
    if (!r || r.deletedAt) return null;
    return { name: r.title, ...parsePayload<FilePayload>(r.payload, { noteId: "", mime: "", size: 0, data: "" }) };
  }, [id]);
}

export function ImageView({ fileId, onRemove }: { fileId?: string; onRemove: () => void }) {
  const a = useAttachment(fileId);
  const [open, setOpen] = useState(false);
  if (a === undefined) return <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-bg-elev2" />;
  if (!a?.data)
    return (
      <div className="flex items-center justify-between rounded-2xl bg-bg-elev1 px-4 py-6 text-[13px] text-text-4">
        Foto belum sampai di HP ini.
        <button onClick={onRemove} className="text-text-4">✕</button>
      </div>
    );
  return (
    <div className="group relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={a.data}
        alt={a.name}
        onClick={() => setOpen(true)}
        className="max-h-[480px] w-full cursor-zoom-in rounded-2xl bg-bg-elev1 object-contain"
      />
      <button
        onClick={onRemove}
        aria-label="Hapus foto"
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-[13px] text-white opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        ✕
      </button>
      {open &&
        createPortal(
          <div className="backdrop-in fixed inset-0 z-[90] grid place-items-center bg-black/90 p-4" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.data} alt={a.name} className="max-h-full max-w-full object-contain" />
          </div>,
          document.body,
        )}
    </div>
  );
}

export function FileView({ fileId, name, size, onRemove }: { fileId?: string; name?: string; size?: number; onRemove: () => void }) {
  const a = useAttachment(fileId);
  const ext = (name ?? "").split(".").pop()?.toUpperCase() ?? "";
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-bg-elev1 px-3 py-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg-card text-[10px] font-extrabold text-text-2 shadow-card">
        {ext.slice(0, 4) || "📎"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-text-1">{name || "File"}</div>
        <div className="text-[11px] text-text-4">
          {size ? formatBytes(size) : ""}
          {a === null ? " · belum sampai di HP ini" : ""}
        </div>
      </div>
      {a?.data && (
        <a href={a.data} download={name} className="rounded-full bg-bg-card px-3 py-1.5 text-[12px] font-semibold text-text-2 shadow-card">
          Buka
        </a>
      )}
      <button onClick={onRemove} aria-label="Hapus file" className="px-1 text-[13px] text-text-4">
        ✕
      </button>
    </div>
  );
}
