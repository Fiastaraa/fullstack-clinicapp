/*
  Warnings:

  - A unique constraint covering the columns `[nik]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('KONTROL', 'VAKSINASI', 'CEK_LAB');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED');

-- AlterEnum
ALTER TYPE "VisitStatus" ADD VALUE 'CALLED';

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "poliId" INTEGER;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "nik" TEXT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "estimatedWaitMinutes" INTEGER,
ADD COLUMN     "poliId" INTEGER,
ADD COLUMN     "queueNumber" TEXT;

-- CreateTable
CREATE TABLE "Poli" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "type" "ReminderType" NOT NULL DEFAULT 'KONTROL',
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poli_name_key" ON "Poli"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Poli_code_key" ON "Poli"("code");

-- CreateIndex
CREATE INDEX "Reminder_patientId_idx" ON "Reminder"("patientId");

-- CreateIndex
CREATE INDEX "Reminder_date_idx" ON "Reminder"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_nik_key" ON "Patient"("nik");

-- CreateIndex
CREATE INDEX "Visit_poliId_idx" ON "Visit"("poliId");

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_poliId_fkey" FOREIGN KEY ("poliId") REFERENCES "Poli"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_poliId_fkey" FOREIGN KEY ("poliId") REFERENCES "Poli"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
