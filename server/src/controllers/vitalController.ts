import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { broadcastClinicChange } from "../lib/realtime.js";
const schema = z.object({
  bloodPressure: z.string().trim().min(3).max(20).optional(),
  temperature: z.coerce.number().min(25).max(50).optional(),
  weight: z.coerce.number().positive().max(500).optional(),
  height: z.coerce.number().positive().max(300).optional(),
  complaint: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(5000).optional(),
});
const notesSchema = z.object({
  notes: z.string().trim().max(5000),
});
export async function updateVitals(req: AuthenticatedRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid visit id" });
    }
    const data = schema.parse(req.body);
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { doctor: { select: { userId: true } } },
    });
    if (!visit)
      return res
        .status(404)
        .json({ success: false, message: "Visit not found" });
    if (req.user?.role === "DOCTOR" && visit.doctor.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }
    if (["COMPLETED", "PAID"].includes(visit.status)) {
      return res.status(409).json({
        success: false,
        message: "Vitals cannot be changed after a visit is completed",
      });
    }
    const updated = await prisma.visit.update({
      where: { id },
      data,
      include: { patient: true, doctor: true },
    });
    broadcastClinicChange("visits", id);
    res.json({ success: true, message: "Vitals saved", data: updated });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: e.issues,
        });
    console.error(e);
    res.status(500).json({ success: false, message: "Failed to save vitals" });
  }
}

export async function updateVisitNotes(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid visit id" });
    }
    const { notes } = notesSchema.parse(req.body);
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

    const updated = await prisma.visit.update({
      where: { id },
      data: { notes },
      include: { patient: true, doctor: true },
    });
    broadcastClinicChange("visits", id);
    return res.json({
      success: true,
      message: "Visit notes saved",
      data: updated,
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
      message: "Failed to save visit notes",
    });
  }
}
