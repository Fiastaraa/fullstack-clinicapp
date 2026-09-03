-- ============================================================
-- ASSISTDOC - FULL DATABASE
-- PostgreSQL
-- Development / Testing
-- ============================================================
-- WARNING: This script resets the AssistDoc application tables.
-- Run it only against the AssistDoc development database.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- RESET
-- ------------------------------------------------------------
DROP TABLE IF EXISTS "Reminder" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "Prescription" CASCADE;
DROP TABLE IF EXISTS "Diagnosis" CASCADE;
DROP TABLE IF EXISTS "Visit" CASCADE;
DROP TABLE IF EXISTS "Medicine" CASCADE;
DROP TABLE IF EXISTS "Doctor" CASCADE;
DROP TABLE IF EXISTS "Patient" CASCADE;
DROP TABLE IF EXISTS "Poli" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "ReminderStatus" CASCADE;
DROP TYPE IF EXISTS "ReminderType" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "PrescriptionStatus" CASCADE;
DROP TYPE IF EXISTS "InvoiceStatus" CASCADE;
DROP TYPE IF EXISTS "VisitStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
CREATE TYPE "UserRole" AS ENUM (
  'ADMIN',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'PATIENT'
);

CREATE TYPE "VisitStatus" AS ENUM (
  'WAITING',
  'CALLED',
  'IN_CONSULTATION',
  'COMPLETED',
  'PAID'
);

CREATE TYPE "InvoiceStatus" AS ENUM (
  'UNPAID',
  'PAID'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'TRANSFER',
  'E_WALLET'
);

CREATE TYPE "PrescriptionStatus" AS ENUM (
  'PENDING',
  'READY'
);

CREATE TYPE "ReminderType" AS ENUM (
  'KONTROL',
  'VAKSINASI',
  'CEK_LAB'
);

CREATE TYPE "ReminderStatus" AS ENUM (
  'PENDING',
  'SENT',
  'COMPLETED'
);

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- POLI
-- ------------------------------------------------------------
CREATE TABLE "Poli" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "code" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Poli_name_idx" ON "Poli"("name");

-- ------------------------------------------------------------
-- PATIENTS
-- ------------------------------------------------------------
CREATE TABLE "Patient" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nik" TEXT UNIQUE,
  "birthDate" TIMESTAMP(3),
  "gender" TEXT NOT NULL,
  "age" INTEGER NOT NULL CHECK ("age" >= 0),
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER UNIQUE,
  CONSTRAINT "Patient_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Patient_name_idx" ON "Patient"("name");
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");
CREATE INDEX "Patient_nik_idx" ON "Patient"("nik");
CREATE INDEX "Patient_userId_idx" ON "Patient"("userId");

-- ------------------------------------------------------------
-- DOCTORS
-- ------------------------------------------------------------
CREATE TABLE "Doctor" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "specialization" TEXT NOT NULL,
  "poliId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER UNIQUE,
  CONSTRAINT "Doctor_poliId_fkey"
    FOREIGN KEY ("poliId") REFERENCES "Poli"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Doctor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Doctor_name_idx" ON "Doctor"("name");
CREATE INDEX "Doctor_userId_idx" ON "Doctor"("userId");

-- ------------------------------------------------------------
-- VISITS / QUEUE / VITALS
-- ------------------------------------------------------------
CREATE TABLE "Visit" (
  "id" SERIAL PRIMARY KEY,
  "patientId" INTEGER NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "poliId" INTEGER,
  "queueNumber" TEXT,
  "estimatedWaitMinutes" INTEGER,
  "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "VisitStatus" NOT NULL DEFAULT 'WAITING',
  "complaint" TEXT,
  "bloodPressure" TEXT,
  "temperature" DOUBLE PRECISION,
  "weight" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Visit_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Visit_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Visit_poliId_fkey"
    FOREIGN KEY ("poliId") REFERENCES "Poli"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Visit_visitDate_idx" ON "Visit"("visitDate");
CREATE INDEX "Visit_status_idx" ON "Visit"("status");
CREATE INDEX "Visit_patientId_idx" ON "Visit"("patientId");
CREATE INDEX "Visit_doctorId_idx" ON "Visit"("doctorId");
CREATE INDEX "Visit_poliId_idx" ON "Visit"("poliId");

-- ------------------------------------------------------------
-- REMINDERS
-- ------------------------------------------------------------
CREATE TABLE "Reminder" (
  "id" SERIAL PRIMARY KEY,
  "patientId" INTEGER NOT NULL,
  "type" "ReminderType" NOT NULL DEFAULT 'KONTROL',
  "title" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reminder_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Reminder_patientId_idx" ON "Reminder"("patientId");
CREATE INDEX "Reminder_date_idx" ON "Reminder"("date");

-- ------------------------------------------------------------
-- DIAGNOSES
-- ------------------------------------------------------------
CREATE TABLE "Diagnosis" (
  "id" SERIAL PRIMARY KEY,
  "visitId" INTEGER NOT NULL,
  "diagnosisName" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Diagnosis_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Diagnosis_visitId_idx" ON "Diagnosis"("visitId");

-- ------------------------------------------------------------
-- MEDICINES / INVENTORY
-- ------------------------------------------------------------
CREATE TABLE "Medicine" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "price" NUMERIC(12,2) NOT NULL CHECK ("price" >= 0),
  "stock" INTEGER NOT NULL DEFAULT 0 CHECK ("stock" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Medicine_name_idx" ON "Medicine"("name");
CREATE INDEX "Medicine_stock_idx" ON "Medicine"("stock");

-- ------------------------------------------------------------
-- PRESCRIPTIONS
-- ------------------------------------------------------------
CREATE TABLE "Prescription" (
  "id" SERIAL PRIMARY KEY,
  "visitId" INTEGER NOT NULL,
  "medicineId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Prescription_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Prescription_medicineId_fkey"
    FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Prescription_visitId_idx" ON "Prescription"("visitId");
CREATE INDEX "Prescription_medicineId_idx" ON "Prescription"("medicineId");
CREATE INDEX "Prescription_status_idx" ON "Prescription"("status");

-- ------------------------------------------------------------
-- INVOICES
-- ------------------------------------------------------------
CREATE TABLE "Invoice" (
  "id" SERIAL PRIMARY KEY,
  "visitId" INTEGER NOT NULL UNIQUE,
  "consultationFee" NUMERIC(12,2) NOT NULL CHECK ("consultationFee" >= 0),
  "medicineTotal" NUMERIC(12,2) NOT NULL CHECK ("medicineTotal" >= 0),
  "adminFee" NUMERIC(12,2) NOT NULL CHECK ("adminFee" >= 0),
  "tax" NUMERIC(12,2) NOT NULL CHECK ("tax" >= 0),
  "subtotal" NUMERIC(12,2) NOT NULL CHECK ("subtotal" >= 0),
  "total" NUMERIC(12,2) NOT NULL CHECK ("total" >= 0),
  "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- ------------------------------------------------------------
-- PAYMENTS
-- ------------------------------------------------------------
CREATE TABLE "Payment" (
  "id" SERIAL PRIMARY KEY,
  "invoiceId" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_paidDate_idx" ON "Payment"("paidDate");

-- ------------------------------------------------------------
-- DEMO USERS
-- pgcrypto creates bcrypt-compatible password hashes.
-- All demo accounts use: Admin12345
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "User" ("name", "email", "password", "role") VALUES
('Main Admin', 'admin@assistdoc.com', crypt('Admin12345', gen_salt('bf', 10)), 'ADMIN'),
('Dr. Andi', 'doctor@assistdoc.com', crypt('Admin12345', gen_salt('bf', 10)), 'DOCTOR'),
('Nurse Nina', 'nurse@assistdoc.com', crypt('Admin12345', gen_salt('bf', 10)), 'NURSE'),
('Pharmacist Rani', 'pharmacist@assistdoc.com', crypt('Admin12345', gen_salt('bf', 10)), 'PHARMACIST'),
('Patient Demo', 'patient@assistdoc.com', crypt('Admin12345', gen_salt('bf', 10)), 'PATIENT');

-- ------------------------------------------------------------
-- DEMO POLI
-- ------------------------------------------------------------
INSERT INTO "Poli" ("name", "code") VALUES
('Poli Umum', 'UMU'),
('Poli Obgyn', 'OBG'),
('Poli Anak', 'ANK'),
('Poli Gigi', 'GIG');

-- ------------------------------------------------------------
-- DEMO DOCTORS
-- ------------------------------------------------------------
INSERT INTO "Doctor" ("name", "specialization", "poliId", "userId") VALUES
('Dr. Andi', 'General Practitioner', 1, 2),
('Dr. Budi', 'Obstetrics & Gynecology', 2, NULL),
('Dr. Sarah', 'Pediatrics', 3, NULL);

-- ------------------------------------------------------------
-- DEMO PATIENTS
-- ------------------------------------------------------------
INSERT INTO "Patient" ("name", "nik", "birthDate", "gender", "age", "phone", "address", "userId") VALUES
('Budi Santoso', '3171012304950001', '1995-04-23', 'Male', 28, '081200000001', 'Jl. Merdeka No. 123', NULL),
('Siti Aisyah', '3171015508920002', '1992-08-15', 'Female', 31, '081200000002', 'Jl. Sudirman No. 20', 5),
('John Doe', '3171011210880003', '1988-10-12', 'Male', 35, '081200000003', 'Jl. Gatot Subroto No. 10', NULL),
('Ahmad Rizky', '3171011406810004', '1981-06-14', 'Male', 42, '081200000004', 'Jl. Kemang No. 5', NULL),
('Marina Putri', '3171014101970005', '1997-01-01', 'Female', 26, '081200000005', 'Jl. Melati No. 8', NULL);

-- ------------------------------------------------------------
-- DEMO MEDICINES
-- ------------------------------------------------------------
INSERT INTO "Medicine" ("name", "dosage", "price", "stock") VALUES
('Paracetamol 500mg', '500mg', 5000, 100),
('Vitamin C 500mg', '500mg', 3000, 100),
('Amoxicillin 500mg', '500mg', 7500, 50);

-- ------------------------------------------------------------
-- DEMO VISITS / QUEUE
-- ------------------------------------------------------------
INSERT INTO "Visit" (
  "patientId", "doctorId", "visitDate", "status", "complaint",
  "bloodPressure", "temperature", "weight", "height", "notes"
)
SELECT p.id, d.id, CURRENT_DATE + TIME '08:30', 'WAITING',
       'Keluhan awal pasien', NULL, NULL, NULL, NULL, NULL
FROM "Patient" p, "Doctor" d
WHERE p.phone = '081200000001' AND d.name = 'Dr. Andi';

INSERT INTO "Visit" (
  "patientId", "doctorId", "visitDate", "status", "complaint"
)
SELECT p.id, d.id, CURRENT_DATE + TIME '08:45', 'WAITING',
       'Keluhan awal pasien'
FROM "Patient" p, "Doctor" d
WHERE p.phone = '081200000002' AND d.name = 'Dr. Andi';

INSERT INTO "Visit" (
  "patientId", "doctorId", "visitDate", "status", "complaint",
  "bloodPressure", "temperature", "weight", "height", "notes"
)
SELECT p.id, d.id, CURRENT_DATE + TIME '09:00', 'IN_CONSULTATION',
       'Nyeri perut sejak kemarin', '120/80', 37.2, 60, 165,
       'Pasien sadar dan kooperatif.'
FROM "Patient" p, "Doctor" d
WHERE p.phone = '081200000003' AND d.name = 'Dr. Budi';

INSERT INTO "Visit" (
  "patientId", "doctorId", "visitDate", "status", "complaint",
  "bloodPressure", "temperature", "weight", "height", "notes"
)
SELECT p.id, d.id, CURRENT_DATE + TIME '09:15', 'PAID',
       'Flu dan batuk', '118/78', 37.5, 68, 170,
       'Keluhan ringan.'
FROM "Patient" p, "Doctor" d
WHERE p.phone = '081200000004' AND d.name = 'Dr. Sarah';

INSERT INTO "Visit" (
  "patientId", "doctorId", "visitDate", "status", "complaint"
)
SELECT p.id, d.id, CURRENT_DATE + TIME '09:30', 'WAITING',
       'Keluhan awal pasien'
FROM "Patient" p, "Doctor" d
WHERE p.phone = '081200000005' AND d.name = 'Dr. Sarah';

-- ------------------------------------------------------------
-- DIAGNOSES
-- ------------------------------------------------------------
INSERT INTO "Diagnosis" ("visitId", "diagnosisName", "notes")
SELECT v.id, 'Gastritis', 'Kurangi makanan pedas dan berminyak.'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
WHERE p.phone = '081200000003'
  AND v."visitDate"::date = CURRENT_DATE;

INSERT INTO "Diagnosis" ("visitId", "diagnosisName", "notes")
SELECT v.id, 'Common Cold', 'Istirahat cukup dan minum air.'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
WHERE p.phone = '081200000004'
  AND v."visitDate"::date = CURRENT_DATE;

-- ------------------------------------------------------------
-- PRESCRIPTIONS
-- ------------------------------------------------------------
INSERT INTO "Prescription" ("visitId", "medicineId", "quantity", "status")
SELECT v.id, m.id, 10, 'PENDING'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
JOIN "Medicine" m ON m.name = 'Paracetamol 500mg'
WHERE p.phone = '081200000003' AND v."visitDate"::date = CURRENT_DATE;

INSERT INTO "Prescription" ("visitId", "medicineId", "quantity", "status")
SELECT v.id, m.id, 10, 'PENDING'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
JOIN "Medicine" m ON m.name = 'Amoxicillin 500mg'
WHERE p.phone = '081200000003' AND v."visitDate"::date = CURRENT_DATE;

INSERT INTO "Prescription" ("visitId", "medicineId", "quantity", "status")
SELECT v.id, m.id, 10, 'READY'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
JOIN "Medicine" m ON m.name = 'Paracetamol 500mg'
WHERE p.phone = '081200000004' AND v."visitDate"::date = CURRENT_DATE;

INSERT INTO "Prescription" ("visitId", "medicineId", "quantity", "status")
SELECT v.id, m.id, 10, 'READY'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
JOIN "Medicine" m ON m.name = 'Vitamin C 500mg'
WHERE p.phone = '081200000004' AND v."visitDate"::date = CURRENT_DATE;

-- ------------------------------------------------------------
-- DEMO INVOICE
-- Consultation 30,000 + Admin 5,000 + Medicine 80,000
-- Subtotal 115,000; Tax 18% = 20,700; Total = 135,700
-- ------------------------------------------------------------
INSERT INTO "Invoice" (
  "visitId", "consultationFee", "medicineTotal", "adminFee",
  "tax", "subtotal", "total", "status"
)
SELECT
  v.id,
  30000,
  80000,
  5000,
  20700,
  115000,
  135700,
  'PAID'
FROM "Visit" v
JOIN "Patient" p ON p.id = v."patientId"
WHERE p.phone = '081200000004'
  AND v."visitDate"::date = CURRENT_DATE;

INSERT INTO "Payment" ("invoiceId", "method", "paidDate")
SELECT i.id, 'CASH', CURRENT_TIMESTAMP
FROM "Invoice" i
JOIN "Visit" v ON v.id = i."visitId"
JOIN "Patient" p ON p.id = v."patientId"
WHERE p.phone = '081200000004'
  AND v."visitDate"::date = CURRENT_DATE;

-- ------------------------------------------------------------
-- VERIFY COUNTS
-- ------------------------------------------------------------
DO $$
DECLARE
  users_count INT;
  patients_count INT;
  doctors_count INT;
  visits_count INT;
  diagnoses_count INT;
  medicines_count INT;
  prescriptions_count INT;
  invoices_count INT;
  payments_count INT;
BEGIN
  SELECT COUNT(*) INTO users_count FROM "User";
  SELECT COUNT(*) INTO patients_count FROM "Patient";
  SELECT COUNT(*) INTO doctors_count FROM "Doctor";
  SELECT COUNT(*) INTO visits_count FROM "Visit";
  SELECT COUNT(*) INTO diagnoses_count FROM "Diagnosis";
  SELECT COUNT(*) INTO medicines_count FROM "Medicine";
  SELECT COUNT(*) INTO prescriptions_count FROM "Prescription";
  SELECT COUNT(*) INTO invoices_count FROM "Invoice";
  SELECT COUNT(*) INTO payments_count FROM "Payment";

  RAISE NOTICE 'AssistDoc database ready';
  RAISE NOTICE 'Users: % | Patients: % | Doctors: % | Visits: %', users_count, patients_count, doctors_count, visits_count;
  RAISE NOTICE 'Diagnoses: % | Medicines: % | Prescriptions: %', diagnoses_count, medicines_count, prescriptions_count;
  RAISE NOTICE 'Invoices: % | Payments: %', invoices_count, payments_count;
END $$;

COMMIT;
