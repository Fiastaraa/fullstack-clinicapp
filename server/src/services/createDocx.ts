import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export function generateDocxDocumentation() {
  try {
    const rootDir = path.resolve(process.cwd(), "..");
    const latihanDir = path.join(rootDir, "latihan");
    const tempDir = path.join(latihanDir, "temp_docx");

    if (!fs.existsSync(latihanDir)) {
      fs.mkdirSync(latihanDir, { recursive: true });
    }

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const wordDir = path.join(tempDir, "word");
    const relsDir = path.join(tempDir, "_rels");
    const wordRelsDir = path.join(wordDir, "_rels");

    fs.mkdirSync(wordRelsDir, { recursive: true });
    fs.mkdirSync(relsDir, { recursive: true });

    // 1. [Content_Types].xml
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
    fs.writeFileSync(path.join(tempDir, "[Content_Types].xml"), contentTypesXml, "utf8");

    // 2. _rels/.rels
    const dotRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    fs.writeFileSync(path.join(relsDir, ".rels"), dotRelsXml, "utf8");

    // 3. word/_rels/document.xml.rels
    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    fs.writeFileSync(path.join(wordRelsDir, "document.xml.rels"), docRelsXml, "utf8");

    // Helper XML builders
    const escapeXml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const pTitle = (text: string) =>
      `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="46"/><w:color w:val="168C9B"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const pSubtitle = (text: string) =>
      `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="300"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/><w:sz w:val="24"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const pHeading1 = (text: string) =>
      `<w:p><w:pPr><w:spacing w:before="360" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="14" w:space="4" w:color="168C9B"/></w:pBdr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="32"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const pHeading2 = (text: string) =>
      `<w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="26"/><w:color w:val="168C9B"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const pHeading3 = (text: string) =>
      `<w:p><w:pPr><w:spacing w:before="180" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const pText = (text: string) =>
      `<w:p><w:pPr><w:spacing w:before="60" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const pBullet = (boldTitle: string, desc: string) =>
      `<w:p><w:pPr><w:spacing w:before="40" w:after="60"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr><w:t>&#x2022; ${escapeXml(boldTitle)}: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(desc)}</w:t></w:r></w:p>`;

    const pCode = (codeText: string) => {
      const lines = codeText.split("\n");
      return lines
        .map(
          (line) =>
            `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:ind w:left="400" w:right="400"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="168C9B"/></w:pBdr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
        )
        .join("");
    };

    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>`;

    docXml += pTitle("DOKUMENTASI TEKNIS & LOGIKA KODE");
    docXml += pSubtitle("Analisis Fungsi ensureDummyData() - File: server/src/services/seedDummyData.ts");

    docXml += pHeading1("1. LATAR BELAKANG & TUJUAN FILE");
    docXml += pText(
      "File seedDummyData.ts dibuat untuk menyediakan data master klinik (Master Clinic Data) yang komprehensif, siap pakai, dan konsisten saat aplikasi dijalankan. File ini secara otomatis mengeksekusi proses inisialisasi data klinik yang mencakup 12 Poliklinik spesialis/umum, 15 Dokter berizin lengkap dengan akun autentikasi login (User), serta 50 jenis obat medis farmasi lengkap dengan sediaan dosis, harga satuan, dan stok fisik apotek."
    );
    docXml += pBullet("Otomasi Inisialisasi", "Dieksekusi otomatis setiap kali server Express dijalankan, tanpa perlu menjalankan perintah migrasi manual.");
    docXml += pBullet("Prinsip Idempotensi", "Aman dijalankan berulang kali tanpa membuat data ganda / duplikat berkat penggunaan Prisma upsert dan findFirst.");
    docXml += pBullet("Sinkronisasi Autentikasi", "Dokter dibuatkan kredensial User lengkap dengan password terenkripsi bcrypt dan role DOCTOR.");

    docXml += pHeading1("2. ARSITEKTUR & RELASI DATABASE");
    docXml += pText(
      "Sistem AssistDoc menggunakan PostgreSQL yang dikelola melalui Prisma ORM. Fungsi ini berinteraksi dengan 4 tabel utama yang saling berelasi:"
    );
    docXml += pBullet("Tabel Poli", "Menyimpan nama unit layanan dan kode unik poli (contoh: UMU untuk Poli Umum, OBG untuk Obgyn, GIG untuk Gigi).");
    docXml += pBullet("Tabel User", "Menyimpan data kredensial login (email, password hash, role). Digunakan saat login via JWT.");
    docXml += pBullet("Tabel Doctor", "Menyimpan profil medis dokter, spesialisasi, dan memiliki relasi one-to-one ke tabel User (userId) serta relasi many-to-one ke tabel Poli (poliId).");
    docXml += pBullet("Tabel Medicine", "Menyimpan katalog obat apotek, bentuk sediaan dosis, harga satuan (Decimal), dan stok fisik (stock).");

    docXml += pHeading1("3. ALUR KERJA (WORKFLOW EKSEKUSI)");
    docXml += pText(
      "Berikut adalah urutan kerja (flow of execution) fungsi ensureDummyData() dari awal hingga selesai:"
    );
    docXml += pCode(`[SERVER START: httpServer.listen]
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
             - Klien web (Apotek / Dokter) langsung menerima update live tanpa refresh!`);

    docXml += pHeading1("4. PENJELASAN DETAIL LOGIKA CODE BARIS PER BARIS");

    docXml += pHeading2("A. Logika Seeding Poliklinik & Idempotensi Upsert");
    docXml += pCode(`const polisData = [
  { name: "Poli Umum", code: "UMU" },
  { name: "Poli Gigi & Mulut", code: "GIG" },
  { name: "Poli Kebidanan & Kandungan (Obgyn)", code: "OBG" },
  ...
];

for (const p of polisData) {
  await prisma.poli.upsert({
    where: { code: p.code },
    update: { name: p.name },
    create: { name: p.name, code: p.code },
  });
}`);
    docXml += pText(
      "Penjelasan Logika: Kolom 'code' pada tabel Poli memiliki constraint unik (@unique). Metode upsert memeriksa apakah sudah ada poli dengan code tersebut. Jika ada, sistem mengeksekusi blok 'update'. Jika belum ada, sistem mengeksekusi blok 'create'. Hasilnya: fungsi ini dapat dijalankan ribuan kali tanpa pernah menghasilkan data duplikat."
    );
    docXml += pCode(`const allPolis = await prisma.poli.findMany();
const poliMap = new Map(allPolis.map((p) => [p.code, p.id]));`);
    docXml += pText(
      "Penjelasan Logika: Mengambil seluruh poli dari database dan menyimpannya dalam objek Map (Key = Kode Poli, Value = Database ID). Dengan poliMap, sistem dapat mencari ID poli untuk setiap dokter dalam kecepatan O(1) tanpa perlu query database berulang-ulang."
    );

    docXml += pHeading2("B. Logika Pembuatan Kredensial Login Dokter & Keamanan Bcrypt");
    docXml += pCode(`const bcrypt = await import("bcrypt");
const defaultDoctorPassword = await bcrypt.default.hash("Dokter12345", 10);

for (const d of doctorsData) {
  const poliId = poliMap.get(d.poliCode);

  // 1. Buat User Login
  const user = await prisma.user.upsert({
    where: { email: d.email },
    update: { name: d.name, role: "DOCTOR", password: defaultDoctorPassword },
    create: { name: d.name, email: d.email, role: "DOCTOR", password: defaultDoctorPassword },
  });

  // 2. Tautkan Profil Dokter ke Poli & User Login
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
}`);
    docXml += pBullet("Import Dinamis Bcrypt", "Menggunakan dynamic import agar tidak membebani start-up waktu inisialisasi awal modul.");
    docXml += pBullet("Salt Rounds 10", "Menggunakan standar keamanan industri bcrypt dengan 10 putaran salt hash untuk melindungi kata sandi.");
    docXml += pBullet("Sinkronisasi Relasi Antar Tabel", "User ID yang dihasilkan dari upsert tabel User langsung diinjeksikan ke kolom 'userId' pada tabel Doctor. Hal ini memastikan ketika dokter login dengan emailnya, sistem mengenali pasien dan antrean poli mana yang menjadi wewenang dokter tersebut.");

    docXml += pHeading2("C. Logika Katalog 50 Obat Medis & Manajemen Stok");
    docXml += pCode(`for (const m of medicinesData) {
  const existing = await prisma.medicine.findFirst({ where: { name: m.name } });
  if (existing) {
    await prisma.medicine.update({
      where: { id: existing.id },
      data: { dosage: m.dosage, price: m.price, stock: m.stock },
    });
  } else {
    await prisma.medicine.create({
      data: { name: m.name, dosage: m.dosage, price: m.price, stock: m.stock },
    });
  }
}`);
    docXml += pText(
      "Penjelasan Logika: Memasukkan 50 jenis obat medis yang mencakup analgesik, antipiretik, antibiotik, antihistamin, kardiovaskular, antidiabetes, obat lambung, obat pernapasan, serta multivitamin. Setiap obat memiliki harga satuan yang akurat untuk kalkulasi kasir dan stok fisik yang langsung dapat dikurangi saat resep farmasi disiapkan."
    );

    docXml += pHeading2("D. Logika Siaran Realtime (Socket.io Broadcasting)");
    docXml += pCode(`broadcastClinicChange("medicines");`);
    docXml += pText(
      "Penjelasan Logika: Setelah seluruh obat selesai ditulis ke database, server memancarkan event WebSocket 'clinic:data-changed' dengan payload resource 'medicines'. Klien frontend (React Vite) yang sedang membuka halaman Apotek atau Konsultasi Dokter akan langsung memperbarui katalog obat tanpa perlu me-refresh browser."
    );

    docXml += pHeading1("5. TABEL KREDENSIAL LOGIN DOKTER UNTUK PENGUJIAN");
    docXml += pText("Seluruh akun dokter di bawah ini aktif dengan password: Dokter12345");

    const doctorTable = [
      ["dr. Andi Pratama", "dr.andi@assistdoc.com", "Poli Umum (UMU)", "Dokter Umum"],
      ["dr. Dimas Anggara", "dr.dimas@assistdoc.com", "Poli Umum (UMU)", "Dokter Umum"],
      ["dr. Citra Lestari", "dr.citra@assistdoc.com", "Poli Umum (UMU)", "Dokter Umum"],
      ["dr. Budi Santoso, Sp.OG", "dr.budi@assistdoc.com", "Poli Obgyn (OBG)", "Spesialis Kebidanan & Kandungan"],
      ["dr. Sarah Wijaya, Sp.A", "dr.sarah@assistdoc.com", "Poli Anak (ANK)", "Spesialis Kesehatan Anak"],
      ["dr. Hendra Gunawan, Sp.PD", "dr.hendra@assistdoc.com", "Poli Penyakit Dalam (INT)", "Spesialis Penyakit Dalam"],
      ["dr. Ratna Sari, Sp.M", "dr.ratna@assistdoc.com", "Poli Mata (MAT)", "Spesialis Mata"],
      ["dr. Denny Kurniawan, Sp.THT-KL", "dr.denny@assistdoc.com", "Poli THT (THT)", "Spesialis THT"],
      ["dr. Kevin Sanjaya, Sp.JP", "dr.kevin@assistdoc.com", "Poli Jantung (JAN)", "Spesialis Jantung & Pembuluh Darah"],
      ["dr. Maya Indah, Sp.KK", "dr.maya@assistdoc.com", "Poli Kulit & Kelamin (KUL)", "Spesialis Kulit & Kelamin"],
      ["dr. Rizky Fauzi, Sp.N", "dr.rizky@assistdoc.com", "Poli Saraf (SAR)", "Spesialis Saraf (Neurolog)"],
      ["dr. Wahyu Hidayat, Sp.P", "dr.wahyu@assistdoc.com", "Poli Paru (PAR)", "Spesialis Paru & Pernapasan"],
      ["dr. Fajar Nugroho, Sp.B", "dr.fajar@assistdoc.com", "Poli Bedah (BDH)", "Spesialis Bedah Umum"],
      ["drg. Anita Rahayu", "drg.anita@assistdoc.com", "Poli Gigi (GIG)", "Dokter Gigi Umum"],
      ["drg. Bayu Pratomo, Sp.KG", "drg.bayu@assistdoc.com", "Poli Gigi (GIG)", "Spesialis Konservasi Gigi"],
    ];

    for (const row of doctorTable) {
      docXml += pBullet(`${row[0]} [${row[2]}]`, `Email: ${row[1]} | Password: Dokter12345 | Spesialisasi: ${row[3]}`);
    }

    docXml += pHeading1("6. KESIMPULAN");
    docXml += pText(
      "Implementasi seedDummyData.ts menghasilkan sistem inisialisasi yang kuat, tahan error (fault-tolerant), dan sepenuhnya terintegrasi antara sistem autentikasi pengguna, manajemen antrean medis, peresepan obat apotek, dan kalkulasi tagihan kasir. Sistem ini memastikan pengembang dan pengguna dapat langsung mencoba seluruh skenario alur kerja klinik secara lengkap dan realistis."
    );

    docXml += `</w:body></w:document>`;

    fs.writeFileSync(path.join(wordDir, "document.xml"), docXml, "utf8");

    // Also write markdown version for quick reading in IDE
    const markdownContent = `# DOKUMENTASI TEKNIS & LOGIKA KODE
## Analisis Fungsi \`ensureDummyData()\` - File: \`server/src/services/seedDummyData.ts\`

---

### 1. Latar Belakang & Tujuan
File \`seedDummyData.ts\` dibuat untuk menyediakan data master klinik (Master Clinic Data) yang komprehensif, siap pakai, dan konsisten saat aplikasi dijalankan. File ini secara otomatis mengeksekusi proses inisialisasi data klinik yang mencakup:
- **12 Poliklinik** spesialis/umum.
- **15 Dokter** berizin lengkap dengan akun autentikasi login (User).
- **50 jenis obat medis farmasi** lengkap dengan sediaan dosis, harga satuan, dan stok fisik apotek.

---

### 2. Diagram Alur Kerja (Execution Flow)
\`\`\`
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
\`\`\`

---

### 3. Analisis Logika Kode Baris per Baris

#### A. Poliklinik & Idempotensi \`upsert\`
\`\`\`typescript
for (const p of polisData) {
  await prisma.poli.upsert({
    where: { code: p.code },
    update: { name: p.name },
    create: { name: p.name, code: p.code },
  });
}
\`\`\`
- Kolom \`code\` memiliki constraint unik.
- \`upsert\` mencegah error duplikasi data jika fungsi dijalankan berulang-ulang.

#### B. Dokter & Autentikasi Bcrypt
\`\`\`typescript
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
\`\`\`
- Password \`Dokter12345\` di-hash menggunakan algoritma Bcrypt (salt rounds 10).
- Akun \`User\` ber-role \`DOCTOR\` dibuat dan ditautkan ke profil \`Doctor\` via foreign key \`userId\`.

#### C. Katalog 50 Obat & Stok Apotek
- Memasukkan 50 jenis obat mencakup analgesik, antibiotik, antihistamin, lambung, kardiovaskular, antidiabetes, batuk/flu, dan multivitamin.
- Setiap obat memiliki harga satuan realistis dan kuantitas stok fisik awal di apotek.

#### D. Realtime Broadcast
\`\`\`typescript
broadcastClinicChange("medicines");
\`\`\`
- Memancarkan event WebSocket agar modul Apotek dan Resep Dokter langsung terupdate detik itu juga.

---

### 4. Tabel Akun Login Dokter (Password: \`Dokter12345\`)
| No | Dokter | Poliklinik | Email Login |
|---|---|---|---|
| 1 | dr. Andi Pratama | Poli Umum (UMU) | dr.andi@assistdoc.com |
| 2 | dr. Dimas Anggara | Poli Umum (UMU) | dr.dimas@assistdoc.com |
| 3 | dr. Citra Lestari | Poli Umum (UMU) | dr.citra@assistdoc.com |
| 4 | dr. Budi Santoso, Sp.OG | Poli Obgyn (OBG) | dr.budi@assistdoc.com |
| 5 | dr. Sarah Wijaya, Sp.A | Poli Anak (ANK) | dr.sarah@assistdoc.com |
| 6 | dr. Hendra Gunawan, Sp.PD | Poli Penyakit Dalam (INT) | dr.hendra@assistdoc.com |
| 7 | dr. Ratna Sari, Sp.M | Poli Mata (MAT) | dr.ratna@assistdoc.com |
| 8 | dr. Denny Kurniawan, Sp.THT-KL | Poli THT (THT) | dr.denny@assistdoc.com |
| 9 | dr. Kevin Sanjaya, Sp.JP | Poli Jantung (JAN) | dr.kevin@assistdoc.com |
| 10 | dr. Maya Indah, Sp.KK | Poli Kulit & Kelamin (KUL) | dr.maya@assistdoc.com |
| 11 | dr. Rizky Fauzi, Sp.N | Poli Saraf (SAR) | dr.rizky@assistdoc.com |
| 12 | dr. Wahyu Hidayat, Sp.P | Poli Paru (PAR) | dr.wahyu@assistdoc.com |
| 13 | dr. Fajar Nugroho, Sp.B | Poli Bedah (BDH) | dr.fajar@assistdoc.com |
| 14 | drg. Anita Rahayu | Poli Gigi (GIG) | drg.anita@assistdoc.com |
| 15 | drg. Bayu Pratomo, Sp.KG | Poli Gigi (GIG) | drg.bayu@assistdoc.com |
`;
    fs.writeFileSync(path.join(latihanDir, "Penjelasan_Logic_seedDummyData.md"), markdownContent, "utf8");

    // Compress to DOCX using .NET ZipFile (native DOCX support)
    const destDocx1 = path.join(latihanDir, "Penjelasan_Logic_seedDummyData.docx");
    const destDocx2 = path.join(rootDir, "latihan.docx");

    if (fs.existsSync(destDocx1)) fs.unlinkSync(destDocx1);
    if (fs.existsSync(destDocx2)) fs.unlinkSync(destDocx2);

    execSync(
      `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempDir.replace(/'/g, "''")}', '${destDocx1.replace(/'/g, "''")}')"`,
      { stdio: "inherit" }
    );
    fs.copyFileSync(destDocx1, destDocx2);

    // Clean temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("✅ [DOCX Generator] Created:", destDocx1, "and", destDocx2);
  } catch (err) {
    console.error("❌ [DOCX Generator Error]:", err);
  }
}
