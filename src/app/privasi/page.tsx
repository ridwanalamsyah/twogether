import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi · Twogether",
  description: "Data apa yang disimpan Twogether, di mana, dan hak kalian atas data itu.",
};

// Public page (outside the app shell) so it opens without signing in, e.g.
// from an App Store listing or the landing page. Keep it in sync with what
// the code actually does: services/privacy.ts, lib/crypto.ts, supabase/.
const UPDATED = "18 Oktober 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[640px] bg-bg-app px-5 pb-16 pt-[calc(var(--header-top-pad,24px)+8px)] text-text-1">
      <Link href="/" className="text-[13px] font-semibold text-accent">
        ‹ Twogether
      </Link>
      <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">Kebijakan Privasi</h1>
      <p className="mt-1 text-[13px] text-text-3">Terakhir diperbarui {UPDATED}</p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-text-2 [&_h2]:mb-1.5 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-text-1 [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <p>
            Twogether adalah app untuk dua orang: mencatat uang, ibadah, jadwal, dan kenangan bersama.
            Prinsip kami sederhana: data kalian milik kalian, kami tidak menjualnya, dan kami tidak
            melacak kalian.
          </p>
        </section>

        <section>
          <h2>Data yang disimpan</h2>
          <ul>
            <li>Akun: email, nama, foto profil, dan tanggal lahir kalau diisi.</li>
            <li>
              Isi app yang kalian catat: transaksi, tabungan, tagihan, kebiasaan, catatan, momen, jadwal,
              data kesehatan dan siklus kalau fitur itu dipakai, serta lampiran foto atau suara.
            </li>
            <li>Kalau notifikasi diaktifkan: alamat langganan push dari browser atau HP.</li>
          </ul>
        </section>

        <section>
          <h2>Di mana data disimpan</h2>
          <ul>
            <li>
              Pertama di HP kalian sendiri, sehingga app tetap jalan tanpa internet.
            </li>
            <li>
              Kalau kalian masuk dengan akun dan bergabung di satu ruang berdua, catatan disinkronkan ke
              server database kami (Supabase) agar pasangan bisa melihatnya. Aturan akses di server
              memastikan hanya anggota ruang yang sama yang bisa membaca isinya.
            </li>
            <li>
              Momen bisa dienkripsi di HP sebelum disimpan (AES-256), dengan kunci dari password kalian.
              Kunci itu tidak pernah dikirim ke server.
            </li>
          </ul>
        </section>

        <section>
          <h2>Yang tidak kami lakukan</h2>
          <ul>
            <li>Tidak ada iklan dan tidak ada penjualan data.</li>
            <li>Tidak ada pelacakan atau analitik perilaku.</li>
            <li>
              Laporan error hanya dikirim kalau kalian menyalakannya (Pengaturan → Password &amp; keamanan).
              Isinya pesan error, halaman, dan jenis browser, tanpa nama, email, atau isi catatan.
            </li>
            <li>Tidak membagikan data ke pihak lain, kecuali penyedia layanan yang menjalankan app (hosting dan database) atau bila diwajibkan hukum.</li>
          </ul>
        </section>

        <section>
          <h2>Hak kalian</h2>
          <p>Sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, kalian bisa:</p>
          <ul>
            <li>Mengunduh semua data kapan saja: Pengaturan → Data &amp; cadangan → Simpan cadangan.</li>
            <li>Memperbaiki data langsung di app.</li>
            <li>Menghapus data dari HP ini saja, atau menghapus akun beserta semua catatan: Pengaturan → Data &amp; cadangan.</li>
            <li>Keluar dari ruang berdua. Catatan yang sudah dibagikan tetap ada di ruang itu sampai dihapus.</li>
          </ul>
        </section>

        <section>
          <h2>Di HP kalian</h2>
          <ul>
            <li>App bisa dikunci dengan PIN atau Face ID.</li>
            <li>Nominal uang bisa disembunyikan, dan isi notifikasi bisa disamarkan: Pengaturan → Password &amp; keamanan.</li>
          </ul>
        </section>

        <section>
          <h2>Perubahan</h2>
          <p>
            Kalau kebijakan ini berubah, tanggal di atas ikut diperbarui, dan perubahan penting akan
            diumumkan di dalam app.
          </p>
        </section>
      </div>
    </main>
  );
}
