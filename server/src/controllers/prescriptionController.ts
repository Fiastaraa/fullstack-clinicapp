import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { broadcastClinicChange } from "../lib/realtime.js";
import { ensureInvoiceForVisit } from "../services/invoiceService.js";

const createPrescriptionSchema = z.object({
  visitId: z.coerce.number().int().positive(),
  medicineId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
});

const statusSchema = z.object({
  status: z.literal("READY"),
});

export async function createPrescription(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = createPrescriptionSchema.parse(req.body);

    const medicine = await prisma.medicine.findUnique({
      where: {
        id: data.medicineId,
      },
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    if (medicine.stock < data.quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient medicine stock",
      });
    }

    const visit = await prisma.visit.findUnique({
      where: {
        id: data.visitId,
      },
      include: {
        doctor: { select: { userId: true } },
        invoice: true,
      },
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Kunjungan pasien tidak ditemukan",
      });
    }

    if (visit.doctor.userId !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "Hanya dokter pemeriksa yang berwenang meresepkan obat untuk pasien ini",
      });
    }

    if (visit.status === "PAID" || visit.invoice?.status === "PAID") {
      return res.status(409).json({
        success: false,
        message: "Resep tidak dapat ditambahkan karena tagihan kunjungan ini sudah lunas dibayar di kasir",
      });
    }

    const prescription = await prisma.prescription.create({
      data: {
        visitId: data.visitId,
        medicineId: data.medicineId,
        quantity: data.quantity,
      },
      include: {
        medicine: true,
        visit: true,
      },
    });

    // If an invoice already exists and is unpaid, update medicineTotal and total
    if (visit.invoice && visit.invoice.status === "UNPAID") {
      const allRx = await prisma.prescription.findMany({
        where: { visitId: data.visitId },
        include: { medicine: true },
      });
      const medicineTotal = allRx.reduce(
        (sum, item) => sum + Number(item.medicine.price) * item.quantity,
        0,
      );
      const subtotal =
        Number(visit.invoice.consultationFee) +
        Number(visit.invoice.adminFee) +
        medicineTotal;
      const taxRate = Number(process.env.TAX_RATE ?? 0.18);
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      await prisma.invoice.update({
        where: { id: visit.invoice.id },
        data: {
          medicineTotal,
          subtotal,
          tax,
          total,
        },
      });
      broadcastClinicChange("invoices", visit.invoice.id);
    }

    broadcastClinicChange("prescriptions", prescription.id);

    return res.status(201).json({
      success: true,
      message: "Resep obat berhasil diterbitkan",
      data: prescription,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create prescription",
    });
  }
}

export async function updatePrescriptionStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription id",
      });
    }
    const { status } = statusSchema.parse(req.body);

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        medicine: true,
        visit: {
          include: {
            prescriptions: true,
          },
        },
      },
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    if (prescription.status === "READY") {
      return res.json({
        success: true,
        message: "Medicine is already ready",
        data: prescription,
      });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const claimed = await tx.prescription.updateMany({
        where: { id, status: "PENDING" },
        data: { status },
      });

      // Another request may have completed this prescription while waiting.
      if (claimed.count === 0) {
        return tx.prescription.findUnique({
          where: { id },
          include: { medicine: true, visit: true },
        });
      }

      const stockUpdate = await tx.medicine.updateMany({
        where: {
          id: prescription.medicineId,
          stock: { gte: prescription.quantity },
        },
        data: { stock: { decrement: prescription.quantity } },
      });

      if (stockUpdate.count === 0) {
        throw new Error("Insufficient medicine stock");
      }

      return tx.prescription.findUnique({
        where: { id },
        include: { medicine: true, visit: true },
      });
    });

    const invoice = await ensureInvoiceForVisit(prescription.visitId);
    broadcastClinicChange("prescriptions", id);
    broadcastClinicChange("medicines", prescription.medicineId);
    if (invoice) broadcastClinicChange("invoices", invoice.id);

    return res.json({
      success: true,
      message: invoice
        ? "Medicine ready and invoice generated"
        : "Medicine marked as ready",
      data: updated,
      invoice,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (
      error instanceof Error &&
      error.message === "Insufficient medicine stock"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update prescription",
    });
  }
}
