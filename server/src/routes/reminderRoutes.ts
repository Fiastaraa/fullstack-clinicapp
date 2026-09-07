import { Router } from "express";
import {
  createReminder,
  getReminders,
  rescheduleReminder,
  updateReminderStatus,
} from "../controllers/reminderController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

// Get reminders (Patient sees their own, Staff see clinic-wide)
router.get(
  "/",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "PATIENT"),
  getReminders,
);

// Only doctors can create medical follow-up control schedules
router.post(
  "/",
  authorizeRoles("DOCTOR"),
  createReminder,
);

// Admin & Doctor can reschedule control dates if patient cannot attend
router.patch(
  "/:id/reschedule",
  authorizeRoles("ADMIN", "DOCTOR"),
  rescheduleReminder,
);

// Update status (e.g. mark COMPLETED or PENDING)
router.patch(
  "/:id",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE"),
  updateReminderStatus,
);

export default router;
