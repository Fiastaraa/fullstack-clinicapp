# AssistDoc Database

Database lengkap untuk Clinic Outpatient Management App berdasarkan ERD dan endpoint pada dokumen AssistDoc.

## Entity

- User — login dan role: ADMIN, DOCTOR, NURSE, PHARMACIST, PATIENT
- Patient — biodata pasien
- Doctor — dokter dan spesialisasi
- Visit — registrasi, antrean, keluhan, vital signs, status kunjungan
- Diagnosis — diagnosis dan catatan dokter
- Medicine — obat, dosis, harga, stok
- Prescription — resep per kunjungan dan status persiapan obat
- Invoice — biaya konsultasi, obat, admin, pajak 18%, subtotal, total
- Payment — metode pembayaran dan tanggal bayar

## Cara paling mudah

1. Pastikan PostgreSQL berjalan pada port 5432.
2. Buat database, misalnya `assistdoc`.
3. Jalankan `assistdoc_full.sql` dari DBeaver pada database tersebut.
4. Ubah `server/.env`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/assistdoc"
```

5. Dari `server` jalankan:

```powershell
npm install
npx prisma generate
npm run dev
```

## Login demo

Semua password: `Admin12345`

- admin@assistdoc.com
- doctor@assistdoc.com
- nurse@assistdoc.com
- pharmacist@assistdoc.com
- patient@assistdoc.com (digunakan melalui aplikasi `mobile`)

## Catatan

`assistdoc_full.sql` adalah script reset + schema + dummy data. Script ini menghapus tabel AssistDoc yang ada sebelum membuat ulang. Gunakan hanya pada database development/testing.
