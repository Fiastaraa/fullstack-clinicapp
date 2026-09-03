import { Router } from "express";
import { getUsers } from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
const router = Router();
router.get("/", authenticate, authorizeRoles("ADMIN"), getUsers);
export default router;
