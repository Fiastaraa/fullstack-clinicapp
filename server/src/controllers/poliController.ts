import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const poliSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(10).toUpperCase(),
});

export async function getPolis(_req: Request, res: Response) {
  try {
    const polis = await prisma.poli.findMany({
      orderBy: { name: "asc" },
      include: { doctors: true },
    });
    return res.json({ success: true, data: polis });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load polis",
    });
  }
}

export async function createPoli(req: Request, res: Response) {
  try {
    const data = poliSchema.parse(req.body);
    const poli = await prisma.poli.create({ data });
    return res.status(201).json({
      success: true,
      message: "Poli created",
      data: poli,
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
      message: "Failed to create poli",
    });
  }
}
