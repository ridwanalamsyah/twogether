/**
 * Hand a generated file to the user. On iPhone/iPad (PWA or app) a blob
 * download link does nothing useful, so we open the share sheet ("Simpan ke
 * File"); elsewhere we trigger a normal download.
 */
export async function saveFile(content: string | Blob, filename: string, type: string): Promise<void> {
  const file = new File([content], filename, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (/iPhone|iPad|Android/i.test(navigator.userAgent) && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      /* fall back to download */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
