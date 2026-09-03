import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured. Create server/.env first.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Admin12345";

async function main() {
  console.log("🌱 Seeding AssistDoc demo data...");

  const password = await bcrypt.hash(PASSWORD, 10);

  // -------------------------
  // USERS
  // -------------------------
  const accounts = [
    { name: "Main Admin", email: "admin@assistdoc.com", role: "ADMIN" as const },
    { name: "Dr. Andi", email: "doctor@assistdoc.com", role: "DOCTOR" as const },
    { name: "Nurse Nina", email: "nurse@assistdoc.com", role: "NURSE" as const },
    { name: "Pharmacist Rani", email: "pharmacist@assistdoc.com", role: "PHARMACIST" as const },
    { name: "Patient Demo", email: "patient@assistdoc.com", role: "PATIENT" as const },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        password,
        role: account.role,
      },
      create: {
        name: account.name,
        email: account.email,
        password,
        role: account.role,
      },
    });
  }

  const doctorUser = await prisma.user.findUniqueOrThrow({ where: { email: "doctor@assistdoc.com" } });
  const patientUser = await prisma.user.findUniqueOrThrow({ where: { email: "patient@assistdoc.com" } });

  console.log("  ✓ users");

  // -------------------------
  // POLI
  // -------------------------
  async function poli(name: string, code: string) {
    const existing = await prisma.poli.findFirst({ where: { code } });
    if (existing) {
      return prisma.poli.update({
        where: { id: existing.id },
        data: { name, code },
      });
    }
    return prisma.poli.create({ data: { name, code } });
  }

  const poliUmum = await poli("Poli Umum", "UMU");
  const poliObgyn = await poli("Poli Obgyn", "OBG");
  const poliAnak = await poli("Poli Anak", "ANK");
  const poliGigi = await poli("Poli Gigi", "GIG");

  console.log("  ✓ polis");

  // -------------------------
  // DOCTORS
  // -------------------------
  async function doctor(name: string, specialization: string, poliId: number, userId?: number) {
    const existing = await prisma.doctor.findFirst({ where: { name } });
    if (existing) {
      return prisma.doctor.update({
        where: { id: existing.id },
        data: { specialization, poliId, ...(userId ? { userId } : {}) },
      });
    }

    return prisma.doctor.create({
      data: { name, specialization, poliId, ...(userId ? { userId } : {}) },
    });
  }

  const doctor1 = await doctor("Dr. Andi", "General Practitioner", poliUmum.id, doctorUser.id);
  const doctor2 = await doctor("Dr. Budi", "Obstetrics & Gynecology", poliObgyn.id);
  const doctor3 = await doctor("Dr. Sarah", "Pediatrics", poliAnak.id);

  console.log("  ✓ doctors");

  // -------------------------
  // PATIENTS
  // -------------------------
  async function patient(data: {
    name: string;
    nik?: string;
    birthDate?: Date;
    gender: string;
    age: number;
    phone: string;
    address: string;
    userId?: number;
  }) {
    const existing = await prisma.patient.findFirst({
      where: { phone: data.phone },
    });

    if (existing) {
      return prisma.patient.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.patient.create({ data });
  }

  const patient1 = await patient({
    name: "Budi Santoso",
    nik: "3171012304950001",
    birthDate: new Date("1995-04-23"),
    gender: "Male",
    age: 28,
    phone: "081200000001",
    address: "Jl. Merdeka No. 123",
    userId: patientUser.id,
  });

  const patient2 = await patient({
    name: "Siti Aisyah",
    nik: "3171015508920002",
    birthDate: new Date("1992-08-15"),
    gender: "Female",
    age: 31,
    phone: "081200000002",
    address: "Jl. Sudirman No. 20",
  });

  const patient3 = await patient({
    name: "John Doe",
    nik: "3171011210880003",
    birthDate: new Date("1988-10-12"),
    gender: "Male",
    age: 35,
    phone: "081200000003",
    address: "Jl. Gatot Subroto No. 10",
  });

  const patient4 = await patient({
    name: "Ahmad Rizky",
    nik: "3171011406810004",
    birthDate: new Date("1981-06-14"),
    gender: "Male",
    age: 42,
    phone: "081200000004",
    address: "Jl. Kemang No. 5",
  });

  const patient5 = await patient({
    name: "Marina Putri",
    nik: "3171014101970005",
    birthDate: new Date("1997-01-01"),
    gender: "Female",
    age: 26,
    phone: "081200000005",
    address: "Jl. Melati No. 8",
  });

  console.log("  ✓ patients");

  // -------------------------
  // MEDICINES
  // -------------------------
  async function medicine(name: string, dosage: string, price: number, stock: number) {
    const existing = await prisma.medicine.findFirst({ where: { name } });
    if (existing) {
      return prisma.medicine.update({
        where: { id: existing.id },
        data: { dosage, price, stock },
      });
    }

    return prisma.medicine.create({
      data: { name, dosage, price, stock },
    });
  }

  const paracetamol = await medicine("Paracetamol 500mg", "500mg", 5000, 100);
  const vitaminC = await medicine("Vitamin C 500mg", "500mg", 3000, 100);
  const amoxicillin = await medicine("Amoxicillin 500mg", "500mg", 7500, 50);

  console.log("  ✓ medicines");

  // -------------------------
  // TODAY'S QUEUE
  // -------------------------
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);

  async function visit(
    p: { id: number },
    d: { id: number; poliId?: number | null },
    hour: number,
    minute: number,
    status: "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "PAID",
    queueNumber: string,
    estimatedWaitMinutes: number
  ) {
    const visitDate = new Date(today);
    visitDate.setHours(hour, minute, 0, 0);

    const existing = await prisma.visit.findFirst({
      where: {
        patientId: p.id,
        doctorId: d.id,
        visitDate: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { id: "asc" },
    });

    if (existing) {
      return prisma.visit.update({
        where: { id: existing.id },
        data: {
          visitDate,
          status,
          poliId: d.poliId,
          queueNumber,
          estimatedWaitMinutes,
          complaint: "Keluhan awal pasien",
        },
      });
    }

    return prisma.visit.create({
      data: {
        patientId: p.id,
        doctorId: d.id,
        poliId: d.poliId,
        queueNumber,
        estimatedWaitMinutes,
        visitDate,
        status,
        complaint: "Keluhan awal pasien",
      },
    });
  }

  const visit1 = await visit(patient1, doctor1, 8, 30, "WAITING", "A023", 15);
  await visit(patient2, doctor1, 8, 45, "CALLED", "A024", 5);
  const visit3 = await visit(patient3, doctor2, 9, 0, "IN_CONSULTATION", "B005", 0);
  const visit4 = await visit(patient4, doctor3, 9, 15, "COMPLETED", "C010", 0);
  await visit(patient5, doctor3, 9, 30, "WAITING", "C011", 20);

  console.log("  ✓ visits / queue");

  // -------------------------
  // REMINDERS
  // -------------------------
  async function reminder(patientId: number, type: "KONTROL" | "VAKSINASI" | "CEK_LAB", title: string, daysAhead: number, notes?: string) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const existing = await prisma.reminder.findFirst({
      where: { patientId, title },
    });

    if (existing) {
      return prisma.reminder.update({
        where: { id: existing.id },
        data: { type, title, date: targetDate, notes },
      });
    }

    return prisma.reminder.create({
      data: { patientId, type, title, date: targetDate, notes },
    });
  }

  await reminder(patient1.id, "KONTROL", "Jadwal Kontrol Penginat", 7, "Kontrol rutin tekanan darah");
  await reminder(patient1.id, "VAKSINASI", "Vaksinasi Influenza", 14, "Dosis tahunan");
  await reminder(patient1.id, "CEK_LAB", "Cek Lab Hematologi", 21, "Pemeriksaan darah lengkap");

  console.log("  ✓ reminders");

  // -------------------------
  // VITALS + DIAGNOSIS
  // -------------------------
  await prisma.visit.update({
    where: { id: visit3.id },
    data: {
      complaint: "Nyeri perut sejak kemarin",
      bloodPressure: "120/80",
      temperature: 37.2,
      weight: 60,
      height: 165,
      notes: "Pasien sadar dan kooperatif.",
    },
  });

  await prisma.visit.update({
    where: { id: visit4.id },
    data: {
      complaint: "Flu dan batuk",
      bloodPressure: "118/78",
      temperature: 37.5,
      weight: 68,
      height: 170,
      notes: "Keluhan ringan.",
    },
  });

  const diagnosis3 = await prisma.diagnosis.findFirst({ where: { visitId: visit3.id } });
  if (!diagnosis3) {
    await prisma.diagnosis.create({
      data: {
        visitId: visit3.id,
        diagnosisName: "Gastritis",
        notes: "Kurangi makanan pedas dan berminyak.",
      },
    });
  }

  const diagnosis4 = await prisma.diagnosis.findFirst({ where: { visitId: visit4.id } });
  if (!diagnosis4) {
    await prisma.diagnosis.create({
      data: {
        visitId: visit4.id,
        diagnosisName: "Common Cold",
        notes: "Istirahat cukup dan minum air.",
      },
    });
  }

  console.log("  ✓ vitals / diagnoses");

  // -------------------------
  // PRESCRIPTIONS
  // -------------------------
  async function prescription(visitId: number, medicineId: number, quantity: number, status: "PENDING" | "READY") {
    const existing = await prisma.prescription.findFirst({
      where: { visitId, medicineId },
    });

    if (existing) {
      return prisma.prescription.update({
        where: { id: existing.id },
        data: { quantity, status },
      });
    }

    return prisma.prescription.create({
      data: { visitId, medicineId, quantity, status },
    });
  }

  await prescription(visit3.id, paracetamol.id, 10, "PENDING");
  await prescription(visit3.id, amoxicillin.id, 10, "PENDING");
  await prescription(visit4.id, paracetamol.id, 10, "READY");
  await prescription(visit4.id, vitaminC.id, 10, "READY");

  console.log("  ✓ prescriptions");

  // -------------------------
  // DEMO INVOICE + PAYMENT
  // -------------------------
  const consultationFee = 30000;
  const adminFee = 5000;
  const medicineTotal = 5000 * 10 + 3000 * 10;
  const subtotal = consultationFee + adminFee + medicineTotal;
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const invoice = await prisma.invoice.upsert({
    where: { visitId: visit4.id },
    update: {
      consultationFee,
      medicineTotal,
      adminFee,
      tax,
      subtotal,
      total,
      status: "UNPAID",
    },
    create: {
      visitId: visit4.id,
      consultationFee,
      medicineTotal,
      adminFee,
      tax,
      subtotal,
      total,
      status: "UNPAID",
    },
  });

  const payment = await prisma.payment.findFirst({
    where: { invoiceId: invoice.id },
  });

  if (!payment) {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        method: "CASH",
      },
    });
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "PAID" },
  });

  await prisma.visit.update({
    where: { id: visit4.id },
    data: { status: "PAID" },
  });

  console.log("  ✓ invoice / payment");
  console.log("");
  console.log("========================================");
  console.log("🎉 ASSISTDOC SEED COMPLETE");
  console.log("========================================");
  console.log("Login accounts:");
  console.log("  ADMIN      admin@assistdoc.com / Admin12345");
  console.log("  DOCTOR     doctor@assistdoc.com / Admin12345");
  console.log("  NURSE      nurse@assistdoc.com / Admin12345");
  console.log("  PHARMACIST pharmacist@assistdoc.com / Admin12345");
  console.log("  PATIENT    patient@assistdoc.com / Admin12345");
  console.log(`Demo invoice: #${invoice.id} — Rp ${total.toLocaleString("id-ID")}`);
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
