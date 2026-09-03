import { prisma } from "../lib/prisma.js";

export type PaymentMethod = "CASH" | "TRANSFER" | "E_WALLET";

/**
 * Marks one invoice and its visit as paid exactly once.
 *
 * Every payment entry point uses this function. The transaction-scoped lock
 * prevents simultaneous webhook/status/manual requests from inserting more
 * than one payment for the same invoice.
 */
export async function settleInvoice(
  invoiceId: number,
  method: PaymentMethod,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(3, ${invoiceId}::int)`;

    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, visit: true },
    });

    if (!invoice) return null;
    if (invoice.status === "PAID") {
      return { invoice, payment: null, alreadyPaid: true };
    }

    const payment = await tx.payment.create({
      data: { invoiceId, method },
    });

    await tx.visit.update({
      where: { id: invoice.visitId },
      data: { status: "PAID" },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID" },
      include: { payments: true, visit: true },
    });

    return {
      invoice: updatedInvoice,
      payment,
      alreadyPaid: false,
    };
  });
}
