import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { prisma } from "../lib/prisma.js";
import { broadcastClinicChange } from "../lib/realtime.js";

const patientSchema = z.object({
  name: z.string().trim().min(2).max(100),
  nik: z.string().trim().regex(/^\d{16}$/).optional(),
  birthDate: z.coerce.date().max(new Date()).optional(),
  gender: z.enum(["Male", "Female"]),
  age: z.coerce.number().int().min(0).max(150),
  phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/),
  address: z.string().trim().min(3).max(500),
});

const patientProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    nik: z.union([z.string().trim().regex(/^\d{16}$/), z.null()]).optional(),
    birthDate: z.union([z.coerce.date().max(new Date()), z.null()]).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/).optional(),
    address: z.string().trim().min(3).max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required",
  });

function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}

export async function getPatients(req: AuthenticatedRequest, res: Response) {
  try {
    const search = String(req.query.search ?? "").trim();
    const patients = await prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { nik: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: patients });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load patients",
    });
  }
}

export async function getPatientById(
  req: AuthenticatedRequest,
  res: Response,
) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid patient id" });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { visitDate: "desc" },
          include: {
            doctor: true,
            poli: true,
            diagnoses: true,
            prescriptions: { include: { medicine: true } },
            invoice: { include: { payments: true } },
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    return res.json({ success: true, data: patient });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load patient",
    });
  }
}

export async function createPatient(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = patientSchema.parse(req.body);
    const patient = await prisma.patient.create({ data });
    broadcastClinicChange("patients", patient.id);
    return res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: patient,
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
      message: "Failed to create patient",
    });
  }
}

export async function getMyPatient(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile is not linked to this account",
      });
    }

    return res.json({ success: true, data: patient });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load patient profile",
    });
  }
}

export async function updateMyPatient(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = patientProfileSchema.parse(req.body);
    const current = await prisma.patient.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Patient profile is not linked to this account",
      });
    }

    const updateData = {
      ...data,
      ...(data.birthDate ? { age: calculateAge(data.birthDate) } : {}),
    };

    const patient = await prisma.$transaction(async (tx) => {
      const updatedPatient = await tx.patient.update({
        where: { id: current.id },
        data: updateData,
      });

      if (data.name) {
        await tx.user.update({
          where: { id: req.user!.userId },
          data: { name: data.name },
        });
      }

      return updatedPatient;
    });

    broadcastClinicChange("patients", patient.id);
    return res.json({
      success: true,
      message: "Patient profile updated",
      data: patient,
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
      message: "Failed to update patient profile",
    });
  }
}
