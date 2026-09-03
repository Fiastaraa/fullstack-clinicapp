import { Router } from "express";
import {
  createSnapPayment,
  getPaymentConfig,
  getPaymentStatus,
  handleMidtransNotification,
  mockSettlePayment,
} from "../controllers/paymentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

// Public webhook endpoint for Midtrans notifications (authenticity verified via SHA-512 signature)
router.post("/notification", handleMidtransNotification);

// Public or client-accessible endpoint to get Snap client key & environment config
router.get("/config", getPaymentConfig);

// Protected endpoints
router.use(authenticate);

// Request a Midtrans Snap Token for an unpaid invoice
router.post(
  "/snap-token",
  authorizeRoles("ADMIN", "PATIENT", "NURSE", "PHARMACIST", "DOCTOR"),
  createSnapPayment,
);

// Fallback/simulator settlement for testing when keys are in mock mode
router.post(
  "/mock-settle",
  authorizeRoles("ADMIN", "PATIENT", "NURSE", "PHARMACIST", "DOCTOR"),
  mockSettlePayment,
);

// Check payment transaction status directly with Midtrans
router.get(
  "/status/:orderId",
  authorizeRoles("ADMIN", "PATIENT", "NURSE", "PHARMACIST", "DOCTOR"),
  getPaymentStatus,
);

export default router;
