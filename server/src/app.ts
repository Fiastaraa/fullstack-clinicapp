import cors, { type CorsOptions } from "cors";
import express from "express";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import clinicRoutes from "./routes/clinicRoutes.js";
import diagnosisRoutes from "./routes/diagnosisRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import poliRoutes from "./routes/poliRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import visitRoutes from "./routes/visitRoutes.js";
import { prisma } from "./lib/prisma.js";

export function getAllowedOrigins() {
  return (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  };

  app.disable("x-powered-by");
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({ success: true, message: "AssistDoc API is running" });
  });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ success: true, server: "ok", database: "connected" });
    } catch {
      res.status(503).json({
        success: false,
        server: "ok",
        database: "disconnected",
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/patients", patientRoutes);
  app.use("/api/doctors", doctorRoutes);
  app.use("/api/visits", visitRoutes);
  app.use("/api/diagnoses", diagnosisRoutes);
  app.use("/api/medicines", medicineRoutes);
  app.use("/api/prescriptions", prescriptionRoutes);
  app.use("/api/invoices", clinicRoutes);
  app.use("/api/polis", poliRoutes);
  app.use("/api/reminders", reminderRoutes);
  app.use("/api/payments", paymentRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Endpoint not found" });
  });

  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    },
  );

  return app;
}
