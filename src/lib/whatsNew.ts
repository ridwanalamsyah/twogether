/**
 * The "Yang baru" card shown once after an update. Bump `id` and rewrite
 * `items` when something worth telling ships; a phone that has seen this id
 * won't see it again (still readable from Pengaturan).
 */
export const WHATS_NEW = {
  id: "2026-10-20",
  items: [
    "Notifikasi walau app ditutup: kabar & moment dari pasangan langsung masuk ke HP",
    "Tombol kirim notifikasi tes di Pengaturan → Password & keamanan",
    "Menu bawah lebih halus: penanda tab tidak lagi menembus tombol +",
    "Pasangan baru mulai dengan ruang inti saja, biar tidak kebanyakan",
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
