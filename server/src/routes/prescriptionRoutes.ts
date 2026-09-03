import { Router } from "express";
import {
  createPrescription,
  updatePrescriptionStatus,
} from "../controllers/prescriptionController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", authorizeRoles("DOCTOR"), createPrescription);

router.patch(
  "/:id/status",
  authorizeRoles("PHARMACIST"),
  updatePrescriptionStatus,
);

export default router;
