import { Router } from "express";
import { getDoctors } from "../controllers/doctorController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getDoctors);

export default router;
