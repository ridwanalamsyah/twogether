"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { parsePayload } from "@/lib/payload";

/**
 * Photos, files and voice notes in Supabase Storage (bucket "media", see
 * supabase/migrations/0007_media_storage.sql).
 *
 * The phone that records something keeps the data URL locally, so it works
 * offline. Only the copy sent to the server swaps it for "sb:<path>", and
 * the partner's phone downloads the file the first time it is shown, then
 * keeps it in the Cache API for offline use. If the bucket isn't set up yet,
 * uploads fail quietly and the row is sent with the data URL as before.
 */

const BUCKET = "media";
const CACHE = "media-v1";
const REF = "sb:";

export function isMediaRef(src: string | undefined | null): src is string {
  return !!src && src.startsWith(REF);
}

function cacheKey(path: string) {
  return `/__media/${path}`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

async function cached(path: string): Promise<Blob | null> {
  try {
    const res = await (await caches.open(CACHE)).match(cacheKey(path));
    return res ? await res.blob() : null;
  } catch {
    return null;
  }
}

async function remember(path: string, blob: Blob) {
  try {
    await (await caches.open(CACHE)).put(cacheKey(path), new Response(blob, { headers: { "Content-Type": blob.type } }));
  } catch {
    /* no Cache API: it will just be downloaded again */
  }
}

/** Upload once (skipped when this exact file is already up); returns "sb:<path>" or null. */
async function upload(path: string, dataUrl: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const have = await cached(path);
    if (!have || have.size !== blob.size) {
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type });
      if (error) return null;
      await remember(path, blob);
    }
    return REF + path;
  } catch {
    return null;
  }
}

/**
 * The version of a record to send to the server: inline media moved to
 * Storage. Returns the record unchanged when there's nothing to move or the
 * upload didn't work.
 */
export async function externalizeMedia(
  table: string,
  record: Record<string, unknown>,
  workspaceId: string,
): Promise<Record<string, unknown>> {
  const id = record.id as string;
  if (table === "moments" && typeof record.voice === "string" && record.voice.startsWith("data:")) {
    const ref = await upload(`${workspaceId}/${id}-voice`, record.voice);
    return ref ? { ...record, voice: ref } : record;
  }
  if (table === "items" && record.kind === "note-file" && typeof record.payload === "string") {
    const p = parsePayload<{ data?: string }>(record.payload, {});
    if (p.data?.startsWith("data:")) {
      const ref = await upload(`${workspaceId}/${id}`, p.data);
      return ref ? { ...record, payload: JSON.stringify({ ...p, data: ref }) } : record;
    }
  }
  return record;
}

/** Best effort: delete the stored file of a deleted record. */
export async function removeMedia(table: string, record: Record<string, unknown>, workspaceId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const id = record.id as string;
  const path =
    table === "moments" ? `${workspaceId}/${id}-voice` : table === "items" && record.kind === "note-file" ? `${workspaceId}/${id}` : null;
  if (!path) return;
  try {
    await sb.storage.from(BUCKET).remove([path]);
    await (await caches.open(CACHE)).delete(cacheKey(path));
  } catch {
    /* already gone, or offline: harmless */
  }
}

const objectUrls = new Map<string, string>();

/** A URL an <img>/<audio>/<a> can use for a data URL or an "sb:" link. */
export async function resolveMedia(src: string): Promise<string | null> {
  if (!isMediaRef(src)) return src;
  const path = src.slice(REF.length);
  const known = objectUrls.get(path);
  if (known) return known;
  let blob = await cached(path);
  if (!blob) {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    blob = data;
    await remember(path, blob);
  }
  const url = URL.createObjectURL(blob);
  objectUrls.set(path, url);
  return url;
}

/**
 * React hook around resolveMedia: `undefined` while loading, `null` when the
 * file can't be reached (offline and not downloaded yet).
 */
export function useMediaSrc(src: string | undefined | null): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(() => (src && !isMediaRef(src) ? src : undefined));
  useEffect(() => {
    if (!src) {
      setUrl(null);
      return;
    }
    if (!isMediaRef(src)) {
      setUrl(src);
      return;
    }
    let alive = true;
    setUrl(undefined);
    void resolveMedia(src).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [src]);
  return url;
}
