import { Router } from "express";
import {
  getVisits,
  getVisitById,
  createVisit,
  updateVisitStatus,
} from "../controllers/visitController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  updateVitals,
  updateVisitNotes,
} from "../controllers/vitalController.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "PATIENT"),
  getVisits,
);

router.patch(
  "/:id/vitals",
  authorizeRoles("NURSE", "ADMIN", "DOCTOR"),
  updateVitals,
);

router.patch(
  "/:id/notes",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST"),
  updateVisitNotes,
);

router.get(
  "/:id",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "PATIENT"),
  getVisitById,
);

router.post(
  "/",
  authorizeRoles("ADMIN", "NURSE", "PATIENT"),
  createVisit,
);

router.patch(
  "/:id/status",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST"),
  updateVisitStatus,
);

export default router;
