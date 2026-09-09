import { prisma } from "../lib/prisma.js";
import { broadcastClinicChange } from "../lib/realtime.js";

export async function ensureDummyData() {
  try {
    // -------------------------------------------------------------
    // 1. POLIKLINIK (12 Poli Lengkap)
    // -------------------------------------------------------------
    const polisData = [
      { name: "Poli Umum", code: "UMU" },
      { name: "Poli Gigi & Mulut", code: "GIG" },
      { name: "Poli Anak (Pediatri)", code: "ANK" },
      { name: "Poli Kebidanan & Kandungan (Obgyn)", code: "OBG" },
      { name: "Poli Penyakit Dalam (Internis)", code: "INT" },
      { name: "Poli Mata (Oftalmologi)", code: "MAT" },
      { name: "Poli THT (Telinga Hidung Tenggorokan)", code: "THT" },
      { name: "Poli Jantung & Pembuluh Darah", code: "JAN" },
      { name: "Poli Kulit & Kelamin (Dermatologi)", code: "KUL" },
      { name: "Poli Saraf (Neurologi)", code: "SAR" },
      { name: "Poli Paru & Pernapasan (Pulmonologi)", code: "PAR" },
      { name: "Poli Bedah Umum", code: "BDH" },
    ];

    for (const p of polisData) {
      await prisma.poli.upsert({
        where: { code: p.code },
        update: { name: p.name },
        create: { name: p.name, code: p.code },
      });
    }

    const allPolis = await prisma.poli.findMany();
    const poliMap = new Map(allPolis.map((p) => [p.code, p.id]));

    // -------------------------------------------------------------
    // 2. DOKTER (15 Dokter Spesialis & Umum + Login Account)
    // -------------------------------------------------------------
    const bcrypt = await import("bcrypt");
    const defaultDoctorPassword = await bcrypt.default.hash("Dokter12345", 10);

    const doctorsData = [
      { name: "dr. Andi Pratama", email: "dr.andi@assistdoc.com", specialization: "Dokter Umum", poliCode: "UMU" },
      { name: "dr. Dimas Anggara", email: "dr.dimas@assistdoc.com", specialization: "Dokter Umum", poliCode: "UMU" },
      { name: "dr. Citra Lestari", email: "dr.citra@assistdoc.com", specialization: "Dokter Umum", poliCode: "UMU" },
      { name: "dr. Budi Santoso, Sp.OG", email: "dr.budi@assistdoc.com", specialization: "Spesialis Kebidanan & Kandungan", poliCode: "OBG" },
      { name: "dr. Sarah Wijaya, Sp.A", email: "dr.sarah@assistdoc.com", specialization: "Spesialis Kesehatan Anak", poliCode: "ANK" },
      { name: "dr. Hendra Gunawan, Sp.PD", email: "dr.hendra@assistdoc.com", specialization: "Spesialis Penyakit Dalam", poliCode: "INT" },
      { name: "dr. Ratna Sari, Sp.M", email: "dr.ratna@assistdoc.com", specialization: "Spesialis Mata", poliCode: "MAT" },
      { name: "dr. Denny Kurniawan, Sp.THT-KL", email: "dr.denny@assistdoc.com", specialization: "Spesialis THT", poliCode: "THT" },
      { name: "dr. Kevin Sanjaya, Sp.JP", email: "dr.kevin@assistdoc.com", specialization: "Spesialis Jantung & Pembuluh Darah", poliCode: "JAN" },
      { name: "dr. Maya Indah, Sp.KK", email: "dr.maya@assistdoc.com", specialization: "Spesialis Kulit & Kelamin", poliCode: "KUL" },
      { name: "dr. Rizky Fauzi, Sp.N", email: "dr.rizky@assistdoc.com", specialization: "Spesialis Saraf (Neurolog)", poliCode: "SAR" },
      { name: "dr. Wahyu Hidayat, Sp.P", email: "dr.wahyu@assistdoc.com", specialization: "Spesialis Paru & Pernapasan", poliCode: "PAR" },
      { name: "dr. Fajar Nugroho, Sp.B", email: "dr.fajar@assistdoc.com", specialization: "Spesialis Bedah Umum", poliCode: "BDH" },
      { name: "drg. Anita Rahayu", email: "drg.anita@assistdoc.com", specialization: "Dokter Gigi Umum", poliCode: "GIG" },
      { name: "drg. Bayu Pratomo, Sp.KG", email: "drg.bayu@assistdoc.com", specialization: "Spesialis Konservasi Gigi", poliCode: "GIG" },
    ];

    for (const d of doctorsData) {
      const poliId = poliMap.get(d.poliCode);

      // Create / update User login credential
      const user = await prisma.user.upsert({
        where: { email: d.email },
        update: {
          name: d.name,
          role: "DOCTOR",
          password: defaultDoctorPassword,
        },
        create: {
          name: d.name,
          email: d.email,
          role: "DOCTOR",
          password: defaultDoctorPassword,
        },
      });

      const existing = await prisma.doctor.findFirst({ where: { name: d.name } });
      if (existing) {
        await prisma.doctor.update({
          where: { id: existing.id },
          data: { specialization: d.specialization, poliId, userId: user.id },
        });
      } else {
        await prisma.doctor.create({
          data: {
            name: d.name,
            specialization: d.specialization,
            poliId,
            userId: user.id,
          },
        });
      }
    }

    // Keep demo account doctor@assistdoc.com linked to dr. Andi Pratama
    await prisma.user.upsert({
      where: { email: "doctor@assistdoc.com" },
      update: { role: "DOCTOR", password: defaultDoctorPassword },
      create: { name: "dr. Andi Pratama", email: "doctor@assistdoc.com", role: "DOCTOR", password: defaultDoctorPassword },
    });

    // -------------------------------------------------------------
    // 3. OBAT-OBATAN (50 Jenis Obat Medis Lengkap Farmasi)
    // -------------------------------------------------------------
    const medicinesData = [
      { name: "Paracetamol 500mg", dosage: "500mg Tablet", price: 5000, stock: 200 },
      { name: "Paracetamol Sirup 120mg/5ml", dosage: "Botol 60ml", price: 12000, stock: 80 },
      { name: "Ibuprofen 400mg", dosage: "400mg Tablet", price: 8000, stock: 120 },
      { name: "Asam Mefenamat 500mg", dosage: "500mg Kapsul", price: 9000, stock: 110 },
      { name: "Natrium Diklofenak 50mg", dosage: "50mg Tablet Salut", price: 7500, stock: 90 },
      { name: "Meloxicam 15mg", dosage: "15mg Tablet", price: 14000, stock: 75 },
      { name: "Ketorolac 10mg", dosage: "10mg Tablet", price: 15000, stock: 60 },
      { name: "Tramadol 50mg", dosage: "50mg Kapsul", price: 22000, stock: 40 },
      { name: "Amoxicillin 500mg", dosage: "500mg Kaplet", price: 7500, stock: 150 },
      { name: "Cefixime 100mg", dosage: "100mg Kapsul", price: 25000, stock: 90 },
      { name: "Ciprofloxacin 500mg", dosage: "500mg Tablet", price: 18000, stock: 80 },
      { name: "Azithromycin 500mg", dosage: "500mg Kaplet Salut", price: 35000, stock: 65 },
      { name: "Cefadroxil 500mg", dosage: "500mg Kapsul", price: 16000, stock: 100 },
      { name: "Metronidazole 500mg", dosage: "500mg Tablet", price: 8500, stock: 95 },
      { name: "Cotrimoxazole 480mg", dosage: "480mg Tablet", price: 6000, stock: 70 },
      { name: "Cetirizine 10mg", dosage: "10mg Tablet", price: 6000, stock: 180 },
      { name: "Loratadine 10mg", dosage: "10mg Tablet", price: 8000, stock: 110 },
      { name: "Dexamethasone 0.5mg", dosage: "0.5mg Tablet", price: 3500, stock: 150 },
      { name: "Methylprednisolone 4mg", dosage: "4mg Tablet", price: 12000, stock: 130 },
      { name: "Methylprednisolone 8mg", dosage: "8mg Tablet", price: 18000, stock: 85 },
      { name: "Prednisone 5mg", dosage: "5mg Tablet", price: 4500, stock: 100 },
      { name: "Omeprazole 20mg", dosage: "20mg Kapsul", price: 12500, stock: 160 },
      { name: "Lansoprazole 30mg", dosage: "30mg Kapsul", price: 16000, stock: 120 },
      { name: "Ranitidine 150mg", dosage: "150mg Tablet Salut", price: 7000, stock: 110 },
      { name: "Antasida Doen Tablet Kunyah", dosage: "Tablet Kunyah", price: 4000, stock: 200 },
      { name: "Antasida Doen Suspensi", dosage: "Botol 100ml", price: 11000, stock: 85 },
      { name: "Sukralfat Suspensi 500mg/5ml", dosage: "Botol 100ml", price: 28000, stock: 60 },
      { name: "Domperidone 10mg", dosage: "10mg Tablet", price: 6500, stock: 120 },
      { name: "Ondansetron 4mg", dosage: "4mg Tablet Salut", price: 15000, stock: 75 },
      { name: "Amlodipine 5mg", dosage: "5mg Tablet", price: 6000, stock: 190 },
      { name: "Amlodipine 10mg", dosage: "10mg Tablet", price: 9000, stock: 140 },
      { name: "Captopril 25mg", dosage: "25mg Tablet", price: 4500, stock: 120 },
      { name: "Candesartan 8mg", dosage: "8mg Tablet", price: 18000, stock: 95 },
      { name: "Bisoprolol 5mg", dosage: "5mg Tablet Salut", price: 15000, stock: 85 },
      { name: "Metformin 500mg", dosage: "500mg Tablet", price: 5500, stock: 190 },
      { name: "Glimepiride 2mg", dosage: "2mg Tablet", price: 10000, stock: 110 },
      { name: "Simvastatin 10mg", dosage: "10mg Tablet Salut", price: 7000, stock: 140 },
      { name: "Atorvastatin 20mg", dosage: "20mg Tablet Salut", price: 22000, stock: 85 },
      { name: "Allopurinol 100mg", dosage: "100mg Tablet", price: 6500, stock: 125 },
      { name: "Ambroxol 30mg", dosage: "30mg Tablet", price: 5000, stock: 160 },
      { name: "N-Acetylcysteine 200mg", dosage: "200mg Kapsul", price: 15000, stock: 95 },
      { name: "Dextromethorphan Sirup 60ml", dosage: "Botol 60ml", price: 14000, stock: 70 },
      { name: "Salbutamol 2mg", dosage: "2mg Tablet", price: 4000, stock: 110 },
      { name: "Vitamin C 500mg", dosage: "500mg Tablet", price: 3000, stock: 250 },
      { name: "Vitamin B Kompleks", dosage: "Tablet Salut Gula", price: 3500, stock: 180 },
      { name: "Sangobion Kapsul", dosage: "Kapsul Zat Besi & Folat", price: 15000, stock: 95 },
      { name: "Kalsium Laktat (Kalk) 500mg", dosage: "500mg Tablet", price: 4500, stock: 130 },
      { name: "Oralit Sachet", dosage: "Serbuk Larutan Oral", price: 2000, stock: 300 },
      { name: "Loperamide 2mg", dosage: "2mg Tablet", price: 4500, stock: 115 },
      { name: "Betadine Salep Antiseptik 10g", dosage: "Tube 10g", price: 18000, stock: 75 },
    ];

    for (const m of medicinesData) {
      const existing = await prisma.medicine.findFirst({ where: { name: m.name } });
      if (existing) {
        await prisma.medicine.update({
          where: { id: existing.id },
          data: { dosage: m.dosage, price: m.price, stock: m.stock },
        });
      } else {
        await prisma.medicine.create({
          data: {
            name: m.name,
            dosage: m.dosage,
            price: m.price,
            stock: m.stock,
          },
        });
      }
    }

    console.log("✅ [Seed] Successfully verified and seeded 12 Poli, 15 Dokter, and 50 Obat!");
    broadcastClinicChange("medicines");

  } catch (error) {
    console.error("❌ [Seed Error]:", error);
  }
}
