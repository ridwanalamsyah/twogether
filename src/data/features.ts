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
  { href: "/goals", tint: "var(--tint-green)", emoji: "🎯", title: "Goals", subtitle: "Nabung bareng untuk target", core: true },
  { href: "/moments", tint: "var(--tint-rose)", emoji: "💌", title: "Moments", subtitle: "Cerita & kenangan berdua", core: true },
  { href: "/kita", tint: "var(--tint-pink)", emoji: "💞", title: "Kita", subtitle: "Tanggal penting & date night", core: true },
  { href: "/habits", tint: "var(--tint-lime)", emoji: "🌱", title: "Kebiasaan", subtitle: "Rutinitas harian", core: true },
  { href: "/calendar", tint: "var(--tint-indigo)", emoji: "📅", title: "Kalender", subtitle: "Semua jadwal di satu tempat", core: true },
  { href: "/catatan", tint: "var(--tint-stone)", emoji: "📒", title: "Catatan", subtitle: "Halaman & checklist berdua" },
  { href: "/shalat", tint: "var(--tint-emerald)", emoji: "🕌", title: "Shalat", subtitle: "Jadwal, centang 5 waktu, kiblat" },
  { href: "/siklus", tint: "var(--tint-rose)", emoji: "🌸", title: "Siklus", subtitle: "Kalender haid & perkiraan" },
  { href: "/patungan", tint: "var(--tint-amber)", emoji: "🤝", title: "Patungan", subtitle: "Siapa perlu ganti siapa" },
  { href: "/belanja", tint: "var(--tint-green)", emoji: "🛒", title: "Belanja bareng", subtitle: "Daftar belanja langsung sinkron" },
  { href: "/nikah", tint: "var(--tint-mauve)", emoji: "💍", title: "Rencana nikah", subtitle: "Budget, persiapan, seserahan, tamu", premium: true },
  { href: "/kabar", tint: "var(--tint-rose)", emoji: "💗", title: "Kabar", subtitle: "Kirim kangen & lihat status pasangan", isNew: true },
  { href: "/tantangan", tint: "var(--tint-orange)", emoji: "🔥", title: "Tantangan", subtitle: "Kebiasaan baru, dijalani berdua", isNew: true },
  { href: "/target", tint: "var(--tint-violet)", emoji: "🎯", title: "Target tahunan", subtitle: "Resolusi & review tiap 3 bulan", isNew: true, premium: true },
  { href: "/fokus", tint: "var(--tint-sky)", emoji: "🎧", title: "Fokus bareng", subtitle: "Pomodoro berdua, saling nemenin", isNew: true },
  { href: "/tagihan", tint: "var(--tint-red)", emoji: "🧾", title: "Tagihan", subtitle: "Listrik, kos, cicilan, langganan", isNew: true },
  { href: "/aset", tint: "var(--tint-forest)", emoji: "📈", title: "Aset bersih", subtitle: "Total kekayaan berdua dari bulan ke bulan", isNew: true, premium: true },
  { href: "/dompet", tint: "var(--tint-amber)", emoji: "👛", title: "Dompet", subtitle: "Saldo rekening, e-wallet, tunai", isNew: true },
  { href: "/laporan", tint: "var(--tint-blue)", emoji: "📊", title: "Laporan bulanan", subtitle: "Ke mana uang pergi bulan ini", isNew: true, premium: true },
  { href: "/impor", tint: "var(--tint-stone)", emoji: "⬇️", title: "Impor mutasi", subtitle: "Masukkan CSV dari bank", isNew: true, premium: true },
  { href: "/hijriah", tint: "var(--tint-pine)", emoji: "🌙", title: "Kalender Hijriah", subtitle: "Hari besar & puasa sunnah", isNew: true },
  { href: "/ramadhan", tint: "var(--tint-gold)", emoji: "🏮", title: "Ramadhan", subtitle: "Imsak, buka, catatan puasa & qadha", isNew: true },
  { href: "/tilawah", tint: "var(--tint-emerald)", emoji: "📖", title: "Tilawah", subtitle: "Target khatam berdua", isNew: true },
  { href: "/zakat", tint: "var(--tint-bronze)", emoji: "🤲", title: "Zakat", subtitle: "Hitung fitrah, harta, penghasilan", isNew: true },
  { href: "/jadwal", tint: "var(--tint-violet)", emoji: "🎓", title: "Jadwal kuliah", subtitle: "Kelas tiap minggu" },
  { href: "/skripsi", tint: "var(--tint-purple)", emoji: "📚", title: "Skripsi", subtitle: "Bab & bimbingan" },
  { href: "/uang", tint: "var(--tint-amber)", emoji: "💰", title: "Hutang & langganan", subtitle: "Hutang, langganan, gajian" },
  { href: "/sehat", tint: "var(--tint-sky)", emoji: "💧", title: "Sehat", subtitle: "Air, tidur, mood, olahraga" },
  { href: "/rumah", tint: "var(--tint-orange)", emoji: "🏠", title: "Rumah", subtitle: "Belanja, stok dapur, masak" },
  { href: "/list", tint: "var(--tint-yellow)", emoji: "📝", title: "List", subtitle: "Wishlist, ide kado, tontonan" },
  { href: "/travel", tint: "var(--tint-cyan)", emoji: "✈️", title: "Travel", subtitle: "Rencana liburan bareng" },
  { href: "/belajar", tint: "var(--tint-ochre)", emoji: "📖", title: "Belajar", subtitle: "Buku, kursus, fokus" },
  { href: "/reflection", tint: "var(--tint-teal)", emoji: "🪞", title: "Refleksi", subtitle: "Jurnal syukur harian" },
  { href: "/pencapaian", tint: "var(--tint-sun)", emoji: "🏆", title: "Pencapaian", subtitle: "Lencana & streak" },
  { href: "/insights", tint: "var(--tint-emerald)", emoji: "🧭", title: "Insights", subtitle: "Pola pengeluaran" },
  { href: "/digest", tint: "var(--tint-stone)", emoji: "📬", title: "Ringkasan", subtitle: "Rekap mingguan" },
  { href: "/wrapped", tint: "var(--tint-crimson)", emoji: "🎁", title: "Wrapped", subtitle: "Kilas balik tahunan" },
];

/** Ready-made bundles so a couple can switch on a whole theme at once. */
/**
 * Space bundles. Onboarding switches on only each bundle's `starter` spaces
 * (a new couple shouldn't face 20 icons on day one); "Paket ruang" in
 * Jelajah adds the full set.
 */
export const BUNDLES: { id: string; emoji: string; title: string; tint: string; hrefs: string[]; starter: string[] }[] = [
  { id: "ibadah", emoji: "🤲", title: "Ibadah", tint: "var(--tint-pine)", hrefs: ["/shalat", "/hijriah", "/ramadhan", "/tilawah", "/zakat"], starter: ["/shalat", "/tilawah"] },
  { id: "uang", emoji: "💰", title: "Uang", tint: "var(--tint-amber)", hrefs: ["/tagihan", "/dompet", "/laporan", "/impor", "/patungan"], starter: ["/tagihan", "/patungan"] },
  { id: "berdua", emoji: "💞", title: "Berdua", tint: "var(--tint-pink)", hrefs: ["/kabar", "/tantangan", "/target", "/belanja", "/catatan"], starter: ["/kabar", "/tantangan"] },
  { id: "kuliah", emoji: "🎓", title: "Kuliah", tint: "var(--tint-violet)", hrefs: ["/jadwal", "/skripsi", "/fokus", "/belajar"], starter: ["/jadwal", "/skripsi"] },
  { id: "nikah", emoji: "💍", title: "Menuju halal", tint: "var(--tint-mauve)", hrefs: ["/nikah", "/target", "/dompet", "/tilawah"], starter: ["/nikah", "/target"] },
  { id: "sehat", emoji: "🌿", title: "Sehat & rumah", tint: "var(--tint-sky)", hrefs: ["/sehat", "/siklus", "/rumah", "/belanja"], starter: ["/sehat", "/siklus"] },
];

export const CORE_FEATURES = FEATURES.filter((f) => f.core).map((f) => f.href);

/** Soft tinted background for a space tile, works in light & dark. */
export function tintBg(tint: string, pct = 16): string {
  return `color-mix(in srgb, ${tint} ${pct}%, transparent)`;
}
