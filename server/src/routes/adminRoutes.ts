import { Router } from "express";
import { getAdminDashboard } from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("ADMIN"),
  getAdminDashboard,
);

export default router;
