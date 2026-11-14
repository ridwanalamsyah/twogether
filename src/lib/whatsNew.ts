/**
 * The "Yang baru" card shown once after an update. Bump `id` and rewrite
 * `items` when something worth telling ships; a phone that has seen this id
 * won't see it again (still readable from Pengaturan).
 */
export const WHATS_NEW = {
  id: "2026-11-14-v103",
  items: [
    "Kartu 'Sudah bersama' kini selalu di paling atas Beranda dengan animasi angka & tab pegas interaktif",
    "Tampilan lebih ringkas dan tidak penuh tulisan: kotak jawaban pertanyaan harian dibuka saat tombol 'Jawab' diketuk",
    "Transisi halaman, sheet, dan daftar ruang memakai gerak pegas halus yang menghormati mode hemat gerak",
    "Kontras warna terang, gelap, dan seluruh tema musiman dikalibrasi penuh ke standar WCAG AA",
  ],
};

const KEY = "twogether:whats-new";

export function whatsNewSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === WHATS_NEW.id;
  } catch {
    return true; // can't remember it either: don't nag every launch
  }
}

export function markWhatsNewSeen() {
  try {
    localStorage.setItem(KEY, WHATS_NEW.id);
  } catch {
    /* private mode */
  }
}
