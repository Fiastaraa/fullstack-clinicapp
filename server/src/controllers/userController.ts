import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: users });
  } catch {
    res.status(500).json({ success: false, message: "Failed to load users" });
  }
}
