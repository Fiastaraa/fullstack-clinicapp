import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { broadcastClinicChange } from "../lib/realtime.js";
import { ensureInvoiceForVisit } from "../services/invoiceService.js";
import { settleInvoice } from "../services/paymentService.js";

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const visitId = Number(req.body.visitId);

    if (!Number.isInteger(visitId) || visitId <= 0) {
      return res.status(400).json({
        success: false,
        message: "visitId is required",
      });
    }

    const visit = await prisma.visit.findUnique({
      where: {
        id: visitId,
      },
      include: {
        prescriptions: { select: { status: true } },
        invoice: true,
        doctor: { select: { userId: true } },
      },
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (req.user?.role === "DOCTOR" && visit.doctor.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    if (visit.invoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice already exists",
        data: visit.invoice,
      });
    }

    if (!["COMPLETED", "PAID"].includes(visit.status)) {
      return res.status(409).json({
        success: false,
        message: "Invoice can only be generated after the visit is completed",
      });
    }

    if (visit.prescriptions.some((item) => item.status === "PENDING")) {
      return res.status(409).json({
        success: false,
        message: "Invoice will be generated after all medicines are ready",
      });
    }

    const invoice = await ensureInvoiceForVisit(visitId);
    if (!invoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice is not ready to be generated",
      });
    }

    broadcastClinicChange("invoices", invoice.id);

    return res.status(201).json({
      success: true,
      message: "Invoice generated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
    });
  }
}

export async function getInvoiceById(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid invoice id" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            patient: true,
            doctor: true,
            diagnoses: true,
            prescriptions: {
              include: {
                medicine: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      req.user?.role === "PATIENT" &&
      invoice.visit.patient.userId !== req.user.userId
    ) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    if (
      req.user?.role === "DOCTOR" &&
      invoice.visit.doctor.userId !== req.user.userId
    ) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load invoice",
    });
  }
}

export async function payInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const method = req.body.method;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid invoice id" });
    }

    if (!["CASH", "TRANSFER", "E_WALLET"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be CASH, TRANSFER, or E_WALLET",
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already paid",
      });
    }

    const result = await settleInvoice(id, method);
    if (!result) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (!result.alreadyPaid) {
      broadcastClinicChange("invoices", id);
      broadcastClinicChange("visits", invoice.visitId);
    }

    return res.json({
      success: true,
      message: "Payment completed successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to process payment",
    });
  }
}
