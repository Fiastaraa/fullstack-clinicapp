# AssistDoc Patient Mobile

Aplikasi pasien berbasis React Native, Expo SDK 54, dan Expo Router. Token login disimpan melalui expo-secure-store. Data pasien selalu diambil dari server yang sama dengan web staff.

## Menjalankan

~~~powershell
Copy-Item .env.example .env
npm install
npx expo start --lan
~~~

Ganti alamat IP di .env dengan IPv4 laptop. Buka Expo Go di HP, lalu pindai QR code.

## Route mobile

- Login dan pendaftaran akun pasien.
- Beranda serta profil pasien.
- Pendaftaran poli.
- Antrean real-time.
- Riwayat dan detail rekam medis.
- Tagihan serta pembayaran Midtrans.
- Jadwal dan pengingat kontrol.

Semua request memakai JWT. Socket.IO hanya mengirim sinyal bahwa data berubah; isi rekam medis tetap diminta ulang melalui endpoint yang memeriksa kepemilikan akun.
