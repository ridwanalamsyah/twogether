"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Paperclip, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/db";
import { upsertItem } from "@/stores/data";
import { parsePayload } from "@/lib/people";
import { compressImage, fileToDataUrl } from "@/lib/image";
import { formatBytes } from "@/lib/notes";
import { useMediaSrc } from "@/services/media";

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
  const src = useMediaSrc(a?.data);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (a === undefined || (a?.data && src === undefined))
    return <div className="skeleton aspect-[4/3] w-full rounded-2xl" />;
  if (!a?.data || !src)
    return (
      <div className="flex items-center justify-between rounded-2xl bg-bg-elev1 px-4 py-4 text-[13px] text-text-4">
        Foto belum sampai di HP ini.
        <button
          type="button"
          aria-label="Hapus lampiran"
          onClick={onRemove}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-4 hover:bg-bg-elev2"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    );
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Buka pratinjau ${a.name || "foto"}`}
        className="block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-bg-elev1"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={a.name}
          width={800}
          height={600}
          className="h-auto max-h-[480px] w-full object-contain"
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Hapus foto"
        className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X size={16} aria-hidden />
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={a.name} className="backdrop-in fixed inset-0 z-[90] grid place-items-center bg-black/90 p-4">
            <button
              type="button"
              aria-label="Tutup pratinjau foto"
              onClick={() => setOpen(false)}
              className="absolute inset-0"
            />
            <button
              type="button"
              aria-label="Tutup pratinjau"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white"
            >
              <X size={20} aria-hidden />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={a.name}
              width={1200}
              height={900}
              className="pointer-events-none relative z-10 h-auto max-h-full max-w-full object-contain"
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

export function FileView({ fileId, name, size, onRemove }: { fileId?: string; name?: string; size?: number; onRemove: () => void }) {
  const a = useAttachment(fileId);
  const src = useMediaSrc(a?.data);
  const ext = (name ?? "").split(".").pop()?.toUpperCase() ?? "";
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-bg-elev1 px-3 py-2.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-card text-[12px] font-extrabold text-text-2 shadow-card">
        {ext.slice(0, 4) || <Paperclip size={16} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-text-1">{name || "File"}</div>
        <div className="text-[12px] text-text-4">
          {size ? formatBytes(size) : ""}
          {a === null ? " · belum sampai di HP ini" : ""}
        </div>
      </div>
      {src && (
        <a
          href={src}
          download={name}
          className="inline-flex min-h-[44px] items-center rounded-full bg-bg-card px-4 text-[12px] font-semibold text-text-2 shadow-card"
        >
          Buka
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Hapus file"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-4 hover:bg-bg-elev2"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
