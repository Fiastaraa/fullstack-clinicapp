# DOKUMENTASI TEKNIS & LOGIKA KODE
## Analisis Fungsi `ensureDummyData()` - File: `server/src/services/seedDummyData.ts`

---

### 1. Latar Belakang & Tujuan
File `seedDummyData.ts` dibuat untuk menyediakan data master klinik (Master Clinic Data) yang komprehensif, siap pakai, dan konsisten saat aplikasi dijalankan. File ini secara otomatis mengeksekusi proses inisialisasi data klinik yang mencakup:
- **12 Poliklinik** spesialis/umum.
- **15 Dokter** berizin lengkap dengan akun autentikasi login (User).
- **50 jenis obat medis farmasi** lengkap dengan sediaan dosis, harga satuan, dan stok fisik apotek.

---

### 2. Diagram Alur Kerja (Execution Flow)
```
[SERVER START: httpServer.listen]
       │
       ▼
[PANGGIL: ensureDummyData()]
       │
       ├─► TAHAP 1: SEEDING 12 POLIKLINIK
       │     - Iterasi array polisData
       │     - Gunakan prisma.poli.upsert (where: code)
       │     - Bangun poliMap di memori: Map<code, id> O(1)
       │
       ├─► TAHAP 2: SEEDING 15 DOKTER & KREDENSIAL LOGIN
       │     - Hash password default "Dokter12345" dengan bcrypt (salt 10)
       │     - Iterasi array doctorsData
       │     - Upsert tabel User (email, role="DOCTOR", password_hash)
       │     - Tautkan record Doctor ke userId dan poliId
       │     - Pastikan akun demo doctor@assistdoc.com aktif
       │
       ├─► TAHAP 3: SEEDING 50 OBAT MEDIS FARMASI
       │     - Iterasi array medicinesData
       │     - Cek apakah obat sudah ada (findFirst by name)
       │     - Update dosage/price/stock jika ada, atau Create jika belum ada
       │
       └─► TAHAP 4: BROADCAST REALTIME SOCKET.IO
             - Panggil broadcastClinicChange("medicines")
             - Klien web (Apotek / Dokter) langsung menerima update live tanpa refresh!
```

---

### 3. Analisis Logika Kode Baris per Baris

#### A. Poliklinik & Idempotensi `upsert`
```typescript
for (const p of polisData) {
  await prisma.poli.upsert({
    where: { code: p.code },
    update: { name: p.name },
    create: { name: p.name, code: p.code },
  });
}
```
- Kolom `code` memiliki constraint unik.
- `upsert` mencegah error duplikasi data jika fungsi dijalankan berulang-ulang.

#### B. Dokter & Autentikasi Bcrypt
```typescript
const bcrypt = await import("bcrypt");
const defaultDoctorPassword = await bcrypt.default.hash("Dokter12345", 10);

for (const d of doctorsData) {
  const poliId = poliMap.get(d.poliCode);

  const user = await prisma.user.upsert({
    where: { email: d.email },
    update: { name: d.name, role: "DOCTOR", password: defaultDoctorPassword },
    create: { name: d.name, email: d.email, role: "DOCTOR", password: defaultDoctorPassword },
  });

  const existing = await prisma.doctor.findFirst({ where: { name: d.name } });
  if (existing) {
    await prisma.doctor.update({
      where: { id: existing.id },
      data: { specialization: d.specialization, poliId, userId: user.id },
    });
  } else {
    await prisma.doctor.create({
      data: { name: d.name, specialization: d.specialization, poliId, userId: user.id },
    });
  }
}
```
- Password `Dokter12345` di-hash menggunakan algoritma Bcrypt (salt rounds 10).
- Akun `User` ber-role `DOCTOR` dibuat dan ditautkan ke profil `Doctor` via foreign key `userId`.

#### C. Katalog 50 Obat & Stok Apotek
- Memasukkan 50 jenis obat mencakup analgesik, antibiotik, antihistamin, lambung, kardiovaskular, antidiabetes, batuk/flu, dan multivitamin.
- Setiap obat memiliki harga satuan realistis dan kuantitas stok fisik awal di apotek.

#### D. Realtime Broadcast
```typescript
broadcastClinicChange("medicines");
```
- Memancarkan event WebSocket agar modul Apotek dan Resep Dokter langsung terupdate detik itu juga.

---

### 4. Tabel Akun Login Dokter (Password: `Dokter12345`)
| No | Dokter | Poliklinik | Email Login |
|---|---|---|---|
| 1 | Dr. Andi Pratama | Poli Umum (UMU) | dr.andi@assistdoc.com |
| 2 | Dr. Dimas Anggara | Poli Umum (UMU) | dr.dimas@assistdoc.com |
| 3 | Dr. Citra Lestari | Poli Umum (UMU) | dr.citra@assistdoc.com |
| 4 | Dr. Budi Santoso, Sp.OG | Poli Obgyn (OBG) | dr.budi@assistdoc.com |
| 5 | Dr. Sarah Wijaya, Sp.A | Poli Anak (ANK) | dr.sarah@assistdoc.com |
| 6 | Dr. Hendra Gunawan, Sp.PD | Poli Penyakit Dalam (INT) | dr.hendra@assistdoc.com |
| 7 | Dr. Ratna Sari, Sp.M | Poli Mata (MAT) | dr.ratna@assistdoc.com |
| 8 | Dr. Denny Kurniawan, Sp.THT-KL | Poli THT (THT) | dr.denny@assistdoc.com |
| 9 | Dr. Kevin Sanjaya, Sp.JP | Poli Jantung (JAN) | dr.kevin@assistdoc.com |
| 10 | Dr. Maya Indah, Sp.KK | Poli Kulit & Kelamin (KUL) | dr.maya@assistdoc.com |
| 11 | Dr. Rizky Fauzi, Sp.N | Poli Saraf (SAR) | dr.rizky@assistdoc.com |
| 12 | Dr. Wahyu Hidayat, Sp.P | Poli Paru (PAR) | dr.wahyu@assistdoc.com |
| 13 | Dr. Fajar Nugroho, Sp.B | Poli Bedah (BDH) | dr.fajar@assistdoc.com |
| 14 | Drg. Anita Rahayu | Poli Gigi (GIG) | drg.anita@assistdoc.com |
| 15 | Drg. Bayu Pratomo, Sp.KG | Poli Gigi (GIG) | drg.bayu@assistdoc.com |
