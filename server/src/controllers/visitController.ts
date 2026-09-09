import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { prisma } from "../lib/prisma.js";
import { broadcastClinicChange } from "../lib/realtime.js";
import { ensureInvoiceForVisit } from "../services/invoiceService.js";

const createVisitSchema = z.object({
  patientId: z.coerce.number().int().positive().optional(),
  doctorId: z.coerce.number().int().positive(),
  poliId: z.coerce.number().int().positive().optional(),
  complaint: z.string().trim().max(1000).optional(),
});

const statusSchema = z.object({
  status: z.enum(["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "PAID"]),
});

const visitInclude = {
  patient: true,
  doctor: true,
  poli: true,
  diagnoses: true,
  prescriptions: { include: { medicine: true } },
  invoice: { include: { payments: true } },
} as const;

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function canChangeStatus(
  role: NonNullable<AuthenticatedRequest["user"]>["role"],
  current: string,
  next: string,
) {
  if (current === next) return true;
  if (role === "ADMIN") return true;

  const allowed: Record<string, string[]> = {
    NURSE: [
      "WAITING:CALLED",
      "WAITING:IN_CONSULTATION",
      "CALLED:IN_CONSULTATION",
    ],
    DOCTOR: [
      "WAITING:IN_CONSULTATION",
      "CALLED:IN_CONSULTATION",
      "IN_CONSULTATION:COMPLETED",
    ],
    PHARMACIST: [
      "PAID:COMPLETED",
      "COMPLETED:COMPLETED",
      "WAITING:COMPLETED",
      "CALLED:COMPLETED",
      "IN_CONSULTATION:COMPLETED",
    ],
  };

  return allowed[role]?.includes(`${current}:${next}`) ?? false;
}

export async function getVisits(req: AuthenticatedRequest, res: Response) {
  try {
    // `date` is kept as a backwards-compatible alias for older clients.
    const scope = String(req.query.scope ?? req.query.date ?? "today");
    if (!["today", "all", "history"].includes(scope)) {
      return res.status(400).json({
        success: false,
        message: "scope must be today, history, or all",
      });
    }

    const where: Record<string, unknown> = {};
    const { start, end } = todayRange();
    if (scope === "today") where.visitDate = { gte: start, lte: end };
    if (scope === "history") where.visitDate = { lt: start };

    if (req.user?.role === "PATIENT") {
      where.patient = { userId: req.user.userId };
    }
    if (req.user?.role === "DOCTOR") {
      where.doctor = { userId: req.user.userId };
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { visitDate: scope === "history" ? "desc" : "asc" },
      include: visitInclude,
    });

    return res.json({ success: true, data: visits });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load visits",
    });
  }
}

export async function getVisitById(
  req: AuthenticatedRequest,
  res: Response,
) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid visit id" });
  }

  try {
    const where: Record<string, unknown> = { id };
    if (req.user?.role === "PATIENT") {
      where.patient = { userId: req.user.userId };
    }
    if (req.user?.role === "DOCTOR") {
      where.doctor = { userId: req.user.userId };
    }

    const visit = await prisma.visit.findFirst({
      where,
      include: visitInclude,
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    return res.json({ success: true, data: visit });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load visit",
    });
  }
}

export async function createVisit(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = createVisitSchema.parse(req.body);
    let patientId = data.patientId;

    if (req.user?.role === "PATIENT") {
      const ownProfile = await prisma.patient.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!ownProfile) {
        return res.status(409).json({
          success: false,
          message: "Complete your patient profile before registering a visit",
        });
      }
      patientId = ownProfile.id;
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required for staff registration",
      });
    }

    const [patient, doctor] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.doctor.findUnique({
        where: { id: data.doctorId },
        include: { poli: true },
      }),
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    if (data.poliId && doctor.poliId && data.poliId !== doctor.poliId) {
      return res.status(400).json({
        success: false,
        message: "Selected doctor does not serve the selected poli",
      });
    }

    const poliId = doctor.poliId ?? data.poliId;
    const queuePrefix = doctor.poli?.code ?? "A";
    const queueLockKey = poliId ?? doctor.id;
    const { start, end } = todayRange();

    const outcome = await prisma.$transaction(async (tx) => {
      // Transaction-scoped locks prevent duplicate active visits and queue
      // numbers when two devices register at nearly the same time.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1, ${patientId}::int)`;

      const existing = await tx.visit.findFirst({
        where: {
          patientId,
          visitDate: { gte: start, lte: end },
          status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] },
        },
        include: visitInclude,
      });
      if (existing) return { existing, visit: null };

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2, ${queueLockKey}::int)`;
      const queueCount = await tx.visit.count({
        where: {
          poliId,
          visitDate: { gte: start, lte: end },
        },
      });
      const sequence = queueCount + 1;

      const visit = await tx.visit.create({
        data: {
          patientId,
          doctorId: doctor.id,
          poliId,
          queueNumber: `${queuePrefix}${String(sequence).padStart(3, "0")}`,
          estimatedWaitMinutes: sequence * 15,
          complaint: data.complaint,
          status: "WAITING",
        },
        include: visitInclude,
      });

      return { existing: null, visit };
    });

    if (outcome.existing) {
      return res.status(409).json({
        success: false,
        message: "Patient already has an active queue today",
        data: outcome.existing,
      });
    }

    const visit = outcome.visit!;

    broadcastClinicChange("visits", visit.id);
    return res.status(201).json({
      success: true,
      message: "Visit registered successfully",
      data: visit,
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
      message: "Failed to create visit",
    });
  }
}

export async function updateVisitStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid visit id" });
    }
    const { status } = statusSchema.parse(req.body);
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }
    if (req.user?.role === "DOCTOR" && visit.doctor.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }
    if (!req.user || !canChangeStatus(req.user.role, visit.status, status)) {
      return res.status(409).json({
        success: false,
        message: `Status cannot change from ${visit.status} to ${status} for this role`,
      });
    }

    const updatedVisit = await prisma.visit.update({
      where: { id },
      data: { status },
      include: visitInclude,
    });

    const invoice = status === "COMPLETED" ? await ensureInvoiceForVisit(id) : null;
    broadcastClinicChange("visits", id);
    if (invoice) broadcastClinicChange("invoices", invoice.id);

    return res.json({
      success: true,
      message: "Visit status updated",
      data: updatedVisit,
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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update visit status",
    });
  }
}
