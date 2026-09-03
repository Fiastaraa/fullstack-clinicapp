import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { broadcastClinicChange } from "../lib/realtime.js";
import {
  midtransService,
  ItemDetail,
} from "../services/midtransService.js";
import { settleInvoice } from "../services/paymentService.js";

type InvoiceOwner = {
  visit: {
    patient: { userId: number | null };
    doctor: { userId: number | null };
  };
};

function canAccessInvoice(req: AuthenticatedRequest, invoice: InvoiceOwner) {
  if (req.user?.role === "PATIENT") {
    return invoice.visit.patient.userId === req.user.userId;
  }
  if (req.user?.role === "DOCTOR") {
    return invoice.visit.doctor.userId === req.user.userId;
  }
  return Boolean(req.user);
}

/**
 * GET /api/payments/config
 * Returns public Midtrans config (Client Key, Environment, Snap Script URL)
 */
export async function getPaymentConfig(_req: Request, res: Response) {
  try {
    const config = midtransService.getConfig();
    return res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Failed to get payment config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get Midtrans configuration",
    });
  }
}

/**
 * POST /api/payments/snap-token
 * Body: { invoiceId: number }
 * Generates a Midtrans Snap payment token for an unpaid invoice
 */
export async function createSnapPayment(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const invoiceId = Number(req.body.invoiceId);

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "invoiceId is required",
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        visit: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
            doctor: true,
            prescriptions: {
              include: {
                medicine: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (!canAccessInvoice(req, invoice)) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (invoice.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already paid",
      });
    }

    const patient = invoice.visit?.patient;
    const patientUser = patient?.user;
    const doctor = invoice.visit?.doctor;

    // Unique order ID format: INV-{invoiceId}-{timestamp}
    const orderId = `INV-${invoice.id}-${Date.now()}`;

    // Item details
    const itemDetails: ItemDetail[] = [];

    const consultationFee = Math.round(Number(invoice.consultationFee));
    if (consultationFee > 0) {
      itemDetails.push({
        id: `CONSULTATION-${invoice.id}`,
        name: `Konsultasi ${doctor?.name ? `(${doctor.name})` : ""}`.slice(0, 50),
        price: consultationFee,
        quantity: 1,
      });
    }

    if (invoice.visit?.prescriptions) {
      invoice.visit.prescriptions.forEach((p, idx) => {
        const itemPrice = Math.round(Number(p.medicine?.price || 0));
        if (itemPrice > 0 && p.quantity > 0) {
          itemDetails.push({
            id: `MED-${p.medicineId}-${idx}`,
            name: (p.medicine?.name || "Obat").slice(0, 50),
            price: itemPrice,
            quantity: p.quantity,
          });
        }
      });
    }

    const adminFee = Math.round(Number(invoice.adminFee));
    if (adminFee > 0) {
      itemDetails.push({
        id: `ADMIN-${invoice.id}`,
        name: "Biaya Administrasi Klinik",
        price: adminFee,
        quantity: 1,
      });
    }

    const taxAmount = Math.round(Number(invoice.tax));
    if (taxAmount > 0) {
      itemDetails.push({
        id: `TAX-${invoice.id}`,
        name: "Pajak Layanan (PPN)",
        price: taxAmount,
        quantity: 1,
      });
    }

    // Midtrans requires gross_amount to equal the exact sum of all item_details price * quantity
    const calculatedItemsTotal = itemDetails.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const grossAmount =
      calculatedItemsTotal > 0
        ? calculatedItemsTotal
        : Math.round(Number(invoice.total));

    const snapPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: patient?.name || "Pasien",
        email: patientUser?.email || "patient@example.com",
        phone: patient?.phone || "081234567890",
      },
      item_details: itemDetails.length > 0 ? itemDetails : undefined,
    };

    const snapResponse = await midtransService.createSnapTransaction(snapPayload);

    return res.status(200).json({
      success: true,
      message: "Snap token generated successfully",
      data: {
        token: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        orderId,
        grossAmount,
        invoiceId: invoice.id,
      },
    });
  } catch (error: any) {
    console.error("Create Snap Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to create Midtrans payment",
    });
  }
}

/**
 * POST /api/payments/notification
 * Webhook handler for Midtrans payment notifications
 */
export async function handleMidtransNotification(req: Request, res: Response) {
  try {
    const payload = req.body;
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
    } = payload;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return res.status(400).json({
        success: false,
        message: "Incomplete notification payload",
      });
    }

    // Verify SHA-512 signature to ensure request comes from Midtrans
    const isValidSignature = midtransService.verifySignature(
      order_id,
      status_code,
      gross_amount,
      signature_key,
    );

    if (!isValidSignature) {
      console.warn(`[Midtrans Webhook] Invalid signature for order: ${order_id}`);
      return res.status(403).json({
        success: false,
        message: "Invalid signature key",
      });
    }

    // Parse invoice ID from order_id format: INV-{invoiceId}-{timestamp}
    const match = order_id.match(/^INV-(\d+)/);
    if (!match) {
      console.warn(`[Midtrans Webhook] Order ID format unrecognized: ${order_id}`);
      return res.status(400).json({
        success: false,
        message: "Unrecognized order ID pattern",
      });
    }

    const invoiceId = Number(match[1]);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      console.warn(`[Midtrans Webhook] Invoice #${invoiceId} not found`);
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isSuccess) {
      if (invoice.status !== "PAID") {
        const paymentMethod = midtransService.mapPaymentMethod(payment_type);

        const settlement = await settleInvoice(invoice.id, paymentMethod);

        if (settlement && !settlement.alreadyPaid) {
          console.log(
            `[Midtrans Webhook] Invoice #${invoice.id} marked as PAID via ${paymentMethod} (${payment_type})`,
          );
          broadcastClinicChange("invoices", invoice.id);
          broadcastClinicChange("visits", invoice.visitId);
        }
      }
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      console.log(
        `[Midtrans Webhook] Transaction ${order_id} failed with status: ${transaction_status}`,
      );
    } else if (transaction_status === "pending") {
      console.log(
        `[Midtrans Webhook] Transaction ${order_id} is pending payment`,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Notification handled successfully",
    });
  } catch (error: any) {
    console.error("Midtrans Notification Webhook Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error processing webhook",
    });
  }
}

/**
 * GET /api/payments/status/:orderId
 * Check transaction status from Midtrans API and sync local DB
 */
export async function getPaymentStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const rawOrderId = req.params.orderId;
    const orderId = String(Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId || "");

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    const match = orderId.match(/^INV-(\d+)/);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Unrecognized order ID pattern",
      });
    }

    const invoiceId = Number(match[1]);
    const accessibleInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        visit: {
          include: {
            patient: { select: { userId: true } },
            doctor: { select: { userId: true } },
          },
        },
      },
    });
    if (!accessibleInvoice || !canAccessInvoice(req, accessibleInvoice)) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const statusData = await midtransService.checkTransactionStatus(orderId);

    // If transaction is settled / captured, ensure local invoice is marked PAID
    const isSuccess =
      statusData.transaction_status === "settlement" ||
      (statusData.transaction_status === "capture" &&
        statusData.fraud_status === "accept");

    if (isSuccess) {
      const paymentMethod = midtransService.mapPaymentMethod(
        statusData.payment_type,
      );
      const settlement = await settleInvoice(invoiceId, paymentMethod);
      if (settlement && !settlement.alreadyPaid) {
        broadcastClinicChange("invoices", invoiceId);
        broadcastClinicChange("visits", settlement.invoice.visitId);
      }
    }

    return res.json({
      success: true,
      data: statusData,
    });
  } catch (error: any) {
    console.error("Check Midtrans Status Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to check payment status",
    });
  }
}

/**
 * POST /api/payments/mock-settle
 * Body: { invoiceId: number, method?: "E_WALLET" | "TRANSFER" }
 * For local sandbox/demo simulation when Midtrans keys are placeholders or testing offline
 */
export async function mockSettlePayment(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const invoiceId = Number(req.body.invoiceId);
    const method = req.body.method === "TRANSFER" ? "TRANSFER" : "E_WALLET";

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "invoiceId is required",
      });
    }

    if (
      process.env.NODE_ENV === "production" ||
      (process.env.ALLOW_MOCK_PAYMENTS !== "true" && midtransService.isConfigured)
    ) {
      return res.status(403).json({
        success: false,
        message: "Mock payments are disabled",
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        visit: {
          include: {
            patient: { select: { userId: true } },
            doctor: { select: { userId: true } },
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (!canAccessInvoice(req, invoice)) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (invoice.status === "PAID") {
      return res.json({
        success: true,
        message: "Invoice is already paid",
      });
    }

    const settlement = await settleInvoice(invoice.id, method);
    if (settlement && !settlement.alreadyPaid) {
      broadcastClinicChange("invoices", invoice.id);
      broadcastClinicChange("visits", invoice.visitId);
    }

    return res.json({
      success: true,
      message: "Pembayaran berhasil diselesaikan via Midtrans Simulator",
    });
  } catch (error: any) {
    console.error("Mock Settle Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to process simulated payment",
    });
  }
}
