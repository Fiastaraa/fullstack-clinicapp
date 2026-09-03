import { Router } from "express";
import { createPoli, getPolis } from "../controllers/poliController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getPolis);
router.post("/", authorizeRoles("ADMIN"), createPoli);

export default router;
