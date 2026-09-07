import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { broadcastClinicChange } from "../lib/realtime.js";

const diagnosisSchema = z.object({
  visitId: z.coerce.number().int().positive(),
  diagnosisName: z.string().min(2),
  notes: z.string().optional(),
});

export async function createDiagnosis(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = diagnosisSchema.parse(req.body);

    const visit = await prisma.visit.findUnique({
      where: { id: data.visitId },
      include: {
        doctor: { select: { userId: true } },
        invoice: true,
        diagnoses: true,
      },
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (visit.doctor.userId !== req.user?.userId) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    if (visit.status === "PAID" || visit.invoice?.status === "PAID") {
      return res.status(409).json({
        success: false,
        message: "Diagnosis cannot be added to a completed visit",
      });
    }

    if (visit.status === "COMPLETED" && visit.diagnoses.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Diagnosis cannot be added to a completed visit",
      });
    }

    const diagnosis = await prisma.diagnosis.create({
      data,
    });

    broadcastClinicChange("visits", data.visitId);

    return res.status(201).json({
      success: true,
      message: "Diagnosis saved successfully",
      data: diagnosis,
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
      message: "Failed to save diagnosis",
    });
  }
}
