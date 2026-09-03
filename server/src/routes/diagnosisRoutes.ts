import { Router } from "express";
import { createDiagnosis } from "../controllers/diagnosisController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", authorizeRoles("DOCTOR"), createDiagnosis);

export default router;
