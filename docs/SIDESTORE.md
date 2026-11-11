# Panduan Sideloading Twogether Menggunakan SideStore

SideStore memungkinkan kamu memasang Twogether sebagai aplikasi native iOS (`.ipa`) menggunakan Apple ID gratis **tanpa harus colok Mac/Xcode setiap 7 hari**.

---

## Bagaimana Cara Kerja SideStore?

Pada akun Apple ID gratis, Apple membatasi sertifikat aplikasi hanya berlaku 7 hari.
**SideStore mengatasi ini dengan:**
1. Menggunakan VPN lokal di iPhone (WireGuard tanpa internet eksternal).
2. Memanfaatkan fitur *Background App Refresh* di iOS.
3. Setiap beberapa hari sekali, SideStore akan **me-refresh sertifikat Twogether secara otomatis di latar belakang**.
4. Hasilnya: Aplikasi Twogether tetap aktif selamanya tanpa perlu dicolok ulang ke komputer setiap minggu!

---

## Langkah 1: Pasang SideStore di iPhone (Hanya Sekali)

Kamu butuh komputer (Mac atau Windows) hanya satu kali saja untuk memasang SideStore ke iPhone:

1. Kunjungi panduan resmi pemasangan SideStore: **[https://sidestore.io/](https://sidestore.io/)**
2. Ikuti instruksi sesuai sistem operasi komputermu (menggunakan **SideServer**).
3. Setelah SideServer memasang SideStore ke iPhone:
   - Buka **Settings** iPhone → **General** → **VPN & Device Management** → Percayai Apple ID kamu.
   - Buka aplikasi **SideStore** di iPhone dan login dengan Apple ID yang sama.
   - Pasang profil pairing WireGuard sesuai panduan di layar SideStore.

---

## Langkah 2: Cara Mendapatkan File `Twogether.ipa`

Ada dua cara mudah mendapatkan file `.ipa`:

### Cara A: Otomatis via GitHub Actions (Tanpa Mac)
Kamu tidak butuh Mac untuk build aplikasi ini:
1. Buka repositori Twogether di GitHub.
2. Buka tab **Actions** → pilih workflow **Build iOS IPA (SideStore / AltStore)**.
3. Klik tombol **Run workflow**.
4. Tunggu beberapa menit hingga selesai.
5. Klik hasil workflow, lalu unduh artefak **`Twogether-SideStore-IPA`** (berisi `Twogether.ipa`).

### Cara B: Build Manual di Mac
Jika kamu punya Mac:
```bash
npm run build:ipa
```
File `Twogether.ipa` akan langsung jadi di root folder proyek kamu.

---

## Langkah 3: Pasang Twogether ke SideStore

Ada 2 cara memasang Twogether di iPhone:

### Metode 1: Menggunakan File `.ipa` Langsung
1. Kirim file `Twogether.ipa` ke iPhone (bisa via AirDrop, iCloud Drive, atau unduh langsung dari Safari di iPhone).
2. Buka aplikasi **SideStore** di iPhone.
3. Buka tab **My Apps**.
4. Tekan tombol **`+`** di pojok kiri atas.
5. Pilih file `Twogether.ipa` yang baru saja kamu unduh.
6. SideStore akan menandatangani (sign) dan memasangnya ke Home Screen. Selesai!

### Metode 2: Menggunakan SideStore Source (Otomatis Update)
Jika web Twogether kamu sudah di-deploy ke Vercel / domain sendiri:
1. Buka aplikasi **SideStore** di iPhone.
2. Buka tab **Sources** → tekan tombol **`+`** di pojok kanan atas.
3. Masukkan URL: `https://domain-kamu.com/sidestore.json`
4. Twogether akan muncul di daftar aplikasi SideStore dengan tombol **INSTALL** / **UPDATE**.

---

## Tips Agar Auto-Refresh Berjalan Lancar

1. **Nyalakan Background App Refresh:**
   - Di iPhone: **Settings** → **General** → **Background App Refresh** → pastikan aktif untuk aplikasi **SideStore**.
2. **Koneksi Wi-Fi:**
   - Sambungkan iPhone ke Wi-Fi rumah secara berkala, SideStore akan otomatis me-refresh sisa hari saat kamu sedang tidur / mengisi daya.
3. **Cek Manual Jika Perlu:**
   - Jika kamu jarang terkoneksi Wi-Fi, kamu bisa buka SideStore sesekali dan tekan tombol **Refresh All** di tab *My Apps*.
