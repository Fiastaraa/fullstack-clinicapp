# AssistDoc

AssistDoc terdiri dari tiga bagian yang memakai satu database PostgreSQL:

- client - web khusus staff klinik: Admin, Dokter, Perawat, dan Apoteker.
- server - REST API Express, Prisma, autentikasi JWT, Midtrans, dan Socket.IO.
- mobile - aplikasi pasien React Native Expo Go.

UI/UX halaman staff dipertahankan. Modul pasien sudah dikeluarkan dari web dan dipindahkan ke aplikasi mobile.

## Persiapan Windows

1. Pasang Node.js LTS dan PostgreSQL.
2. Buka folder proyek di File Explorer.
3. Jalankan SETUP_WINDOWS.bat.
4. Buat database PostgreSQL, lalu sesuaikan DATABASE_URL pada server\.env.
5. Dari terminal folder server, jalankan:

~~~powershell
npx prisma migrate dev
npm run db:seed
~~~

## Menjalankan aplikasi

Web staff tersedia di http://localhost:5173, server di http://localhost:3001, dan Expo menampilkan QR code untuk aplikasi pasien.

## Menghubungkan HP ke server

localhost pada HP berarti HP itu sendiri. Salin mobile\.env.example menjadi mobile\.env, lalu ganti 192.168.1.10 dengan IPv4 laptop (lihat melalui ipconfig). HP dan laptop harus berada pada Wi-Fi yang sama. Pastikan Windows Firewall mengizinkan Node.js pada jaringan privat.

## Akun demo

Semua akun seed memakai password Admin12345.

| Aplikasi | Email |
| --- | --- |
| Web Admin | admin@assistdoc.com |
| Web Dokter | doctor@assistdoc.com |
| Web Perawat | nurse@assistdoc.com |
| Web Apoteker | pharmacist@assistdoc.com |
| Mobile Pasien | patient@assistdoc.com |

## Pemeriksaan kode

~~~powershell
cd client
npm run build

cd ..\server
npm run build

cd ..\mobile
npm run typecheck
~~~

Penjelasan route, alur fungsi, role, dan integrasi tersedia di dokumen DOKUMENTASI_ALUR_KODE_ASSISTDOC.docx.
