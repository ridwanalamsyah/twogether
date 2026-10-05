"use client";

import { parseReceipt, type ParsedReceipt } from "@/lib/receiptParse";

/**
 * Read a receipt photo on the device (no upload). The OCR engine and the
 * Indonesian/English language data are served from /ocr (copied there at
 * build time) and cached by the browser after the first scan.
 */
export async function scanReceipt(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParsedReceipt & { text: string }> {
  const image = await shrink(file);
  const { createWorker } = await import("tesseract.js");
  const base = `${window.location.origin}/ocr/`;
  const worker = await createWorker(["ind", "eng"], 1, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base.replace(/\/$/, ""),
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return { ...parseReceipt(data.text), text: data.text };
  } finally {
    await worker.terminate();
  }
}

/** Downscale big phone photos — faster OCR, same accuracy. */
async function shrink(file: File): Promise<HTMLCanvasElement | File> {
  try {
    const bmp = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.filter = "grayscale(1) contrast(1.25)";
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return file;
  }
}
