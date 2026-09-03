import { Router } from "express";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  adjustStock,
  deleteMedicine,
} from "../controllers/medicineController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("ADMIN", "DOCTOR", "PHARMACIST"),
  getMedicines,
);
router.post("/", authorizeRoles("ADMIN", "PHARMACIST"), createMedicine);
router.patch("/:id", authorizeRoles("ADMIN", "PHARMACIST"), updateMedicine);
router.patch(
  "/:id/stock",
  authorizeRoles("ADMIN", "PHARMACIST"),
  adjustStock,
);
router.delete("/:id", authorizeRoles("ADMIN", "PHARMACIST"), deleteMedicine);

export default router;
