import { prisma } from "../lib/prisma.js";

export async function ensureInvoiceForVisit(visitId: number) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      prescriptions: { include: { medicine: true } },
      invoice: true,
    },
  });

  if (!visit) throw new Error("Visit not found");
  if (visit.invoice) return visit.invoice;
  if (!(["COMPLETED", "PAID"] as string[]).includes(visit.status)) return null;
  if (visit.prescriptions.some((item) => item.status === "PENDING")) {
    return null;
  }

  const consultationFee = Number(process.env.CONSULTATION_FEE ?? 30000);
  const adminFee = Number(process.env.ADMIN_FEE ?? 5000);
  const taxRate = Number(process.env.TAX_RATE ?? 0.18);
  const medicineTotal = visit.prescriptions.reduce(
    (sum, item) => sum + Number(item.medicine.price) * item.quantity,
    0,
  );
  const subtotal = consultationFee + adminFee + medicineTotal;
  const tax = subtotal * taxRate;

  try {
    return await prisma.invoice.create({
      data: {
        visitId,
        consultationFee,
        medicineTotal,
        adminFee,
        tax,
        subtotal,
        total: subtotal + tax,
        status: "UNPAID",
      },
    });
  } catch (error) {
    const concurrentInvoice = await prisma.invoice.findUnique({
      where: { visitId },
    });
    if (concurrentInvoice) return concurrentInvoice;
    throw error;
  }
}
