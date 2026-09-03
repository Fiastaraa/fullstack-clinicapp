import { Router } from "express";
import {
  createInvoice,
  getInvoiceById,
  payInvoice,
} from "../controllers/invoiceController.js";
import { getReports } from "../controllers/reportController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/reports", authorizeRoles("ADMIN"), getReports);

router.post(
  "/",
  authorizeRoles("ADMIN", "NURSE", "PHARMACIST", "DOCTOR"),
  createInvoice,
);

router.get(
  "/:id",
  authorizeRoles("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "PATIENT"),
  getInvoiceById,
);

router.patch(
  "/:id/pay",
  authorizeRoles("ADMIN", "NURSE", "PHARMACIST"),
  payInvoice,
);

export default router;
