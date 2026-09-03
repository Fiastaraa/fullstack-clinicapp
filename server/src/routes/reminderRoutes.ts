import { Router } from "express";
import {
  createReminder,
  getReminders,
  updateReminderStatus,
} from "../controllers/reminderController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);
router.get(
  "/",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "PATIENT"),
  getReminders,
);
router.post(
  "/",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PATIENT"),
  createReminder,
);
router.patch(
  "/:id",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PATIENT"),
  updateReminderStatus,
);

export default router;
