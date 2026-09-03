import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { prisma } from "../lib/prisma.js";
import { broadcastClinicChange } from "../lib/realtime.js";

const createReminderSchema = z.object({
  patientId: z.coerce.number().int().positive().optional(),
  type: z.enum(["KONTROL", "VAKSINASI", "CEK_LAB"]),
  title: z.string().trim().min(2).max(150),
  date: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
});

const updateReminderStatusSchema = z.object({
  status: z.enum(["PENDING", "SENT", "COMPLETED"]),
});

async function ownPatientId(userId: number) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });
  return patient?.id;
}

export async function getReminders(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const where: { patientId?: number } = {};
    if (req.user?.role === "PATIENT") {
      const patientId = await ownPatientId(req.user.userId);
      if (!patientId) return res.json({ success: true, data: [] });
      where.patientId = patientId;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { date: "asc" },
      include: { patient: true },
    });
    return res.json({ success: true, data: reminders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load reminders",
    });
  }
}

export async function createReminder(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = createReminderSchema.parse(req.body);
    let patientId = data.patientId;

    if (req.user?.role === "PATIENT") {
      patientId = await ownPatientId(req.user.userId);
    }
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const reminder = await prisma.reminder.create({
      data: {
        patientId,
        type: data.type,
        title: data.title,
        date: data.date,
        notes: data.notes,
        status: "PENDING",
      },
      include: { patient: true },
    });
    broadcastClinicChange("reminders", reminder.id);
    return res.status(201).json({
      success: true,
      message: "Reminder created",
      data: reminder,
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
      message: "Failed to create reminder",
    });
  }
}

export async function updateReminderStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid reminder id" });
    }
    const { status } = updateReminderStatusSchema.parse(req.body);
    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });

    if (!reminder) {
      return res.status(404).json({ success: false, message: "Reminder not found" });
    }
    if (
      req.user?.role === "PATIENT" &&
      reminder.patient.userId !== req.user.userId
    ) {
      return res.status(404).json({ success: false, message: "Reminder not found" });
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: { status },
    });
    broadcastClinicChange("reminders", id);
    return res.json({
      success: true,
      message: "Reminder status updated",
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
      message: "Failed to update reminder",
    });
  }
}
