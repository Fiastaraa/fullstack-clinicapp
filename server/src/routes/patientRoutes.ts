import { Router } from "express";
import {
  getPatients,
  createPatient,
  getMyPatient,
  getPatientById,
  updateMyPatient,
} from "../controllers/patientController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/me", authorizeRoles("PATIENT"), getMyPatient);
router.patch("/me", authorizeRoles("PATIENT"), updateMyPatient);

router.get(
  "/",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE"),
  getPatients,
);

router.post(
  "/",
  authorizeRoles("ADMIN", "NURSE"),
  createPatient,
);

router.get(
  "/:id",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE"),
  getPatientById,
);

export default router;
