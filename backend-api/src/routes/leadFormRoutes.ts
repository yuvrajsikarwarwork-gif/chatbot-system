import { Router } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import { requireAuthenticatedUser } from "../middleware/policyMiddleware";
import {
  createLeadFormCtrl,
  deleteLeadFormCtrl,
  getLeadFormCtrl,
  listLeadFormsCtrl,
  updateLeadFormCtrl,
} from "../controllers/leadFormController";

const router = Router();

router.use(authMiddleware);
router.use(requireAuthenticatedUser);

router.get("/", listLeadFormsCtrl);
router.get("/:id", getLeadFormCtrl);
router.post("/", createLeadFormCtrl);
router.put("/:id", updateLeadFormCtrl);
router.delete("/:id", deleteLeadFormCtrl);

export default router;
