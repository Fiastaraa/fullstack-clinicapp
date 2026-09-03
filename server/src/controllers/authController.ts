import { Request, Response } from "express";
import { z } from "zod";
import {
  loginUser,
  registerUser,
  getCurrentUser,
} from "../services/authService.js";
import { broadcastClinicChange } from "../lib/realtime.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8).max(72),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK must contain 16 digits")
    .optional(),
  birthDate: z.coerce.date().max(new Date(), "Birth date cannot be in the future"),
  gender: z.enum(["Male", "Female"]),
  phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/, "Invalid phone number"),
  address: z.string().trim().min(5).max(500),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),

  password: z.string().min(1, "Password is required"),
});

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);

    const user = await registerUser(data);
    broadcastClinicChange("patients");

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    const message =
      error instanceof Error ? error.message : "Failed to register user";

    if (
      message === "Email already registered" ||
      message === "NIK already registered" ||
      message === "Patient data does not match"
    ) {
      return res.status(409).json({
        success: false,
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);

    const result = await loginUser(data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    const message = error instanceof Error ? error.message : "Failed to login";

    if (message === "Invalid email or password") {
      return res.status(401).json({
        success: false,
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const user = await getCurrentUser(userId);
    return res.json({ success: true, data: { user } });
  } catch {
    return res.status(401).json({ success: false, message: "Session expired" });
  }
}
