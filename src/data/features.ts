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
  /** On by default for new couples. */
  core?: boolean;
}

export const FEATURES: Feature[] = [
  { href: "/goals", emoji: "🎯", title: "Goals", subtitle: "Nabung bareng untuk target", core: true },
  { href: "/moments", emoji: "💌", title: "Moments", subtitle: "Cerita & kenangan berdua", core: true },
  { href: "/kita", emoji: "💞", title: "Kita", subtitle: "Tanggal penting & date night", core: true },
  { href: "/habits", emoji: "🌱", title: "Kebiasaan", subtitle: "Rutinitas harian", core: true },
  { href: "/calendar", emoji: "📅", title: "Kalender", subtitle: "Semua jadwal di satu tempat", core: true },
  { href: "/jadwal", emoji: "🎓", title: "Jadwal kuliah", subtitle: "Kelas tiap minggu" },
  { href: "/skripsi", emoji: "📚", title: "Skripsi", subtitle: "Bab & bimbingan" },
  { href: "/uang", emoji: "💰", title: "Hutang & langganan", subtitle: "Hutang, langganan, gajian" },
  { href: "/sehat", emoji: "💧", title: "Sehat", subtitle: "Air, tidur, mood, olahraga" },
  { href: "/rumah", emoji: "🏠", title: "Rumah", subtitle: "Belanja, stok dapur, masak" },
  { href: "/list", emoji: "📝", title: "List", subtitle: "Wishlist, ide kado, tontonan" },
  { href: "/travel", emoji: "✈️", title: "Travel", subtitle: "Rencana liburan bareng" },
  { href: "/belajar", emoji: "📖", title: "Belajar", subtitle: "Buku, kursus, fokus" },
  { href: "/reflection", emoji: "🪞", title: "Refleksi", subtitle: "Jurnal syukur harian" },
  { href: "/pencapaian", emoji: "🏆", title: "Pencapaian", subtitle: "Lencana & streak" },
  { href: "/grafik", emoji: "📈", title: "Grafik", subtitle: "Tren 30 hari" },
  { href: "/insights", emoji: "🧭", title: "Insights", subtitle: "Pola pengeluaran" },
  { href: "/digest", emoji: "📬", title: "Ringkasan", subtitle: "Rekap mingguan" },
  { href: "/wrapped", emoji: "🎁", title: "Wrapped", subtitle: "Kilas balik tahunan" },
];

export const CORE_FEATURES = FEATURES.filter((f) => f.core).map((f) => f.href);
