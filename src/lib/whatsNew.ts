/**
 * The "Yang baru" card shown once after an update. Bump `id` and rewrite
 * `items` when something worth telling ships; a phone that has seen this id
 * won't see it again (still readable from Pengaturan).
 */
export const WHATS_NEW = {
  id: "2026-10-19",
  items: [
    "Jelajah lebih fokus: ruang yang sering kalian buka muncul paling atas",
    "Ruang yang sebulan tidak dibuka bisa disembunyikan sekali ketuk",
    "Tarik-untuk-refresh tidak lagi muncul sendiri di tengah halaman",
    "Isian jam & tanggal di iPhone tidak keluar kotak lagi",
    "Tombol kembali di semua halaman, judul tidak terpotong",
    "Kirim masukan langsung dari Pengaturan",
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
