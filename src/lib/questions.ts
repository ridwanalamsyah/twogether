/**
 * "Pertanyaan hari ini": one question a day, the same on both phones, so a
 * couple has a small reason to open the app together. Light ones mixed with
 * deeper ones; nothing that needs a "right" answer.
 */
export const QUESTIONS: string[] = [
  "Hal kecil apa yang bikin kamu senyum hari ini?",
  "Kalau kita bisa liburan minggu depan, mau ke mana?",
  "Lagu apa yang paling ngingetin kamu sama aku?",
  "Apa satu hal yang pengin kamu coba bareng tahun ini?",
  "Kapan terakhir kamu merasa paling disayang sama aku?",
  "Makanan apa yang pengin kita masak bareng?",
  "Kebiasaan aku yang paling kamu suka apa?",
  "Apa yang lagi bikin kamu kepikiran akhir-akhir ini?",
  "Momen kita yang paling lucu menurutmu yang mana?",
  "Kalau hari ini bisa diulang, bagian mana yang mau kamu ulang?",
  "Satu doa yang lagi sering kamu panjatkan?",
  "Apa yang bikin kamu bangga sama dirimu minggu ini?",
  "Hal apa dari masa kecilmu yang belum pernah kamu ceritain ke aku?",
  "Kalau kita punya rumah sendiri, ruangan apa yang paling penting buatmu?",
  "Apa satu hal yang bisa aku lakuin supaya harimu lebih ringan?",
  "Film atau serial apa yang pengin kamu tonton bareng?",
  "Kata apa yang paling pas menggambarkan hubungan kita sekarang?",
  "Apa impian kecil yang pengin kamu wujudkan bulan ini?",
  "Kapan pertama kali kamu sadar suka sama aku?",
  "Hal apa yang paling kamu syukuri hari ini?",
  "Kalau aku lagi sedih, kamu pengin aku ngapain?",
  "Tempat makan mana yang pengin kamu datangi lagi bareng?",
  "Apa satu hal tentang aku yang belum banyak orang tahu?",
  "Target tabungan apa yang paling bikin kamu semangat?",
  "Kalau kita bikin tradisi tahunan berdua, apa yang kamu mau?",
  "Apa yang paling kamu kangenin dari awal-awal kita kenal?",
  "Lagi pengin belajar hal baru apa?",
  "Apa yang bikin kamu merasa tenang?",
  "Kalau besok libur seharian, mau kita habiskan gimana?",
  "Pelajaran terbesar yang kamu dapat dari hubungan kita?",
  "Hadiah kecil apa yang bakal bikin kamu senang banget?",
  "Ibadah apa yang pengin kamu rutinkan bareng aku?",
  "Apa yang lagi kamu tunggu-tunggu minggu ini?",
  "Kalau bisa kasih satu pesan ke dirimu setahun lalu, apa?",
  "Kegiatan sederhana apa yang paling kamu nikmati bareng aku?",
  "Apa ketakutan kecil yang lagi kamu hadapi?",
  "Lima tahun lagi, kamu bayangin kita lagi ngapain?",
  "Apa yang bikin kamu ketawa paling keras minggu ini?",
  "Sifat aku yang kadang bikin kamu kesal apa? (jujur aja)",
  "Kalau kita bikin playlist berdua, lagu pertamanya apa?",
  "Hal apa yang pengin kamu ubah dari rutinitas kita?",
  "Menurutmu kita paling kompak waktu ngapain?",
  "Apa yang paling kamu hargai dari keluargamu?",
  "Kalau dapat rezeki tak terduga, mau dipakai buat apa?",
  "Kenangan masa sekolah yang paling kamu ingat?",
  "Apa definisi 'hari yang baik' buatmu?",
  "Hal apa yang pengin kamu dengar dari aku lebih sering?",
  "Kota mana yang pengin kamu tinggali suatu saat?",
  "Apa kebiasaan baik yang pengin kita mulai bareng?",
  "Siapa orang yang paling berpengaruh di hidupmu?",
  "Kalau hari ini kamu bisa minta satu hal dari aku, apa?",
  "Apa hal kecil yang bikin kamu merasa diperhatikan?",
  "Buku atau kajian apa yang terakhir berkesan buatmu?",
  "Kalau kita punya hewan peliharaan, mau namanya apa?",
  "Apa yang paling kamu pengin kita perbaiki bareng?",
  "Momen paling bikin deg-degan selama kita bareng?",
  "Apa yang kamu suka dari dirimu sendiri?",
  "Kalau masak buat aku, menu andalanmu apa?",
  "Hal apa yang bikin kamu yakin sama kita?",
  "Satu kata buat aku hari ini?",
];

/** Same question on both phones: picked from the calendar date itself. */
export function questionFor(day: string): { index: number; text: string } {
  const [y, m, d] = day.split("-").map(Number);
  const n = Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
  const index = ((n % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  return { index, text: QUESTIONS[index] };
}
