/**
 * The "Yang baru" card shown once after an update. Bump `id` and rewrite
 * `items` when something worth telling ships; a phone that has seen this id
 * won't see it again (still readable from Pengaturan).
 */
export const WHATS_NEW = {
  id: "2026-11-13",
  items: [
    "Tipografi Plus Jakarta Sans kini aktif penuh di iPhone dan web, termasuk angka tabular yang rapi",
    "Banner status offline menyatu di header atas agar tidak menumpuk di atas judul atau tombol",
    "Navigasi bawah dan tombol cepat pakai gerak pegas yang responsif saat ditekan",
    "Kontras warna terang, gelap, dan seluruh tema musiman disesuaikan ke standar AA",
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
