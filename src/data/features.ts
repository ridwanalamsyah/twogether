/**
 * Every "space" in the app. Only the ones a couple switched on show up in
 * Jelajah and the Beranda shortcuts — the rest wait one tap away under
 * "Tambah ruang", so the app never feels crowded.
 */
export interface Feature {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  /** Signature colour for the space's tile. */
  tint: string;
  /** On by default for new couples. */
  core?: boolean;
  /** Shows a "Baru" badge in Tambah ruang. */
  isNew?: boolean;
  /** Candidate for the future paid plan (not locked yet). */
  premium?: boolean;
}

export const FEATURES: Feature[] = [
  { href: "/goals", tint: "#22c55e", emoji: "🎯", title: "Goals", subtitle: "Nabung bareng untuk target", core: true },
  { href: "/moments", tint: "#f43f5e", emoji: "💌", title: "Moments", subtitle: "Cerita & kenangan berdua", core: true },
  { href: "/kita", tint: "#ec4899", emoji: "💞", title: "Kita", subtitle: "Tanggal penting & date night", core: true },
  { href: "/habits", tint: "#84cc16", emoji: "🌱", title: "Kebiasaan", subtitle: "Rutinitas harian", core: true },
  { href: "/calendar", tint: "#6366f1", emoji: "📅", title: "Kalender", subtitle: "Semua jadwal di satu tempat", core: true },
  { href: "/catatan", tint: "#64748b", emoji: "📒", title: "Catatan", subtitle: "Halaman & checklist berdua", isNew: true },
  { href: "/shalat", tint: "#10b981", emoji: "🕌", title: "Shalat", subtitle: "Jadwal, centang 5 waktu, kiblat", isNew: true },
  { href: "/siklus", tint: "#f43f5e", emoji: "🌸", title: "Siklus", subtitle: "Kalender haid & perkiraan", isNew: true },
  { href: "/patungan", tint: "#f59e0b", emoji: "🤝", title: "Patungan", subtitle: "Siapa perlu ganti siapa", isNew: true },
  { href: "/belanja", tint: "#22c55e", emoji: "🛒", title: "Belanja bareng", subtitle: "Daftar belanja langsung sinkron", isNew: true },
  { href: "/nikah", tint: "#b76e79", emoji: "💍", title: "Rencana nikah", subtitle: "Budget, persiapan, seserahan, tamu", isNew: true, premium: true },
  { href: "/peta", tint: "#0ea5e9", emoji: "🗺️", title: "Peta kenangan", subtitle: "Tempat-tempat kalian & lokasi", isNew: true, premium: true },
  { href: "/jadwal", tint: "#8b5cf6", emoji: "🎓", title: "Jadwal kuliah", subtitle: "Kelas tiap minggu" },
  { href: "/skripsi", tint: "#a855f7", emoji: "📚", title: "Skripsi", subtitle: "Bab & bimbingan" },
  { href: "/uang", tint: "#f59e0b", emoji: "💰", title: "Hutang & langganan", subtitle: "Hutang, langganan, gajian" },
  { href: "/sehat", tint: "#0ea5e9", emoji: "💧", title: "Sehat", subtitle: "Air, tidur, mood, olahraga" },
  { href: "/rumah", tint: "#f97316", emoji: "🏠", title: "Rumah", subtitle: "Belanja, stok dapur, masak" },
  { href: "/list", tint: "#eab308", emoji: "📝", title: "List", subtitle: "Wishlist, ide kado, tontonan" },
  { href: "/travel", tint: "#06b6d4", emoji: "✈️", title: "Travel", subtitle: "Rencana liburan bareng" },
  { href: "/belajar", tint: "#d97706", emoji: "📖", title: "Belajar", subtitle: "Buku, kursus, fokus" },
  { href: "/reflection", tint: "#14b8a6", emoji: "🪞", title: "Refleksi", subtitle: "Jurnal syukur harian" },
  { href: "/pencapaian", tint: "#facc15", emoji: "🏆", title: "Pencapaian", subtitle: "Lencana & streak" },
  { href: "/grafik", tint: "#3b82f6", emoji: "📈", title: "Grafik", subtitle: "Tren 30 hari" },
  { href: "/insights", tint: "#10b981", emoji: "🧭", title: "Insights", subtitle: "Pola pengeluaran" },
  { href: "/digest", tint: "#64748b", emoji: "📬", title: "Ringkasan", subtitle: "Rekap mingguan" },
  { href: "/wrapped", tint: "#e11d48", emoji: "🎁", title: "Wrapped", subtitle: "Kilas balik tahunan" },
];

export const CORE_FEATURES = FEATURES.filter((f) => f.core).map((f) => f.href);

/** Soft tinted background for a space tile, works in light & dark. */
export function tintBg(tint: string, pct = 16): string {
  return `color-mix(in srgb, ${tint} ${pct}%, transparent)`;
}
