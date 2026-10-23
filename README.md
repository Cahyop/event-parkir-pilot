# Event Parkir Pilot

Buatkan aplikasi sistem parkir event mobile PWA yang siap di-install di smartphone (Android/iOS) dengan gaya antarmuka clean, utilitarian, profesional, mirip aplikasi POS/kasir modern (bukan template dekoratif AI yang penuh gradien atau ilustrasi berlebihan; gunakan tata letak minimalis, tipografi tegas, tombol besar ramah jempol untuk petugas lapangan di luar ruangan).

Fitur lengkap:

1. Manajemen Event & Master Tarif:
- Halaman utama daftar event yang sedang berjalan atau riwayat event.
- Buat event baru: nama acara, tanggal, dan pengaturan jenis kendaraan (default: Motor, fleksibel tambah Mobil/Lainnya) serta setting tarif flat per jenis kendaraan (misal Motor Rp 3.000).

2. Alur Masuk (Check-in & Cetak Karcis):
- Input nomor polisi kendaraan dengan keyboard responsif dan auto-uppercase (misal: B 1234 ABC).
- Pilihan status pembayaran: "Bayar di Awal (Lunas)" atau "Bayar Nanti (Saat Keluar)".
- Fitur Cetak Tiket: integrasi Web Bluetooth ESC/POS untuk printer thermal mini (58mm/80mm) dan fallback print browser. Tiket memuat: Nama Event, Kode Tiket, Nomor Polisi, Jenis Kendaraan, Tarif, Status Pembayaran, Jam Masuk, dan QR Code untuk scanning cepat saat keluar.

3. Alur Keluar (Check-out & Scan QR):
- Pemindai kamera scanner QR code karcis, plus opsi cari manual dengan ketik nopol.
- Saat tiket ditemukan: tampilkan jam masuk, jam keluar saat ini, durasi waktu parkir, dan status pembayaran.
- Jika status "Belum Bayar", petugas bisa konfirmasi pembayaran lunas saat keluar.
- Tombol konfirmasi keluar: status diperbarui menjadi "Selesai/Keluar" dan durasi tercatat.

4. Laporan & Kasir Event:
- Ringkasan pendapatan kas realtime per event: total kendaraan masuk, kendaraan masih di dalam, kendaraan keluar, total uang masuk (lunas di awal vs dibayar di keluar).
- Tabel riwayat transaksi dengan filter status (di dalam / keluar) dan fitur pencarian nopol.

5. PWA & Dukungan Offline/Mobile:
- Konfigurasi Web App Manifest & Service Worker agar aplikasi bisa di-add to home screen / di-install di HP.
- Tampilan responsif mobile-first dengan kontras yang jelas dan mudah dibaca di bawah sinar matahari.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a521d7b4-cced-4aa5-9fb4-188ea2c226d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
