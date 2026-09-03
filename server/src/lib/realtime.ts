import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

type AuthPayload = {
  userId: number;
  role: "ADMIN" | "DOCTOR" | "NURSE" | "PHARMACIST" | "PATIENT";
};

export type ClinicResource =
  | "visits"
  | "patients"
  | "reminders"
  | "prescriptions"
  | "medicines"
  | "invoices";

let realtime: Server | null = null;

export function initializeRealtime(
  server: HttpServer,
  allowedOrigins: string[],
) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not configured");

  realtime = new Server(server, {
    cors: {
      origin: allowedOrigins.length === 0 ? true : allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  realtime.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length === 0) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as AuthPayload;
      socket.data.user = payload;
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  realtime.on("connection", (socket) => {
    const user = socket.data.user as AuthPayload;
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);
  });

  return realtime;
}

export function broadcastClinicChange(resource: ClinicResource, id?: number) {
  realtime?.emit("clinic:data-changed", {
    resource,
    id,
    changedAt: new Date().toISOString(),
  });
}

export async function closeRealtime() {
  if (!realtime) return;
  await new Promise<void>((resolve) => realtime?.close(() => resolve()));
  realtime = null;
}
