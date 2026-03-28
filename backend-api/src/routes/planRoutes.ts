import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireAuthenticatedUser, requirePlatformRoles } from "../middleware/policyMiddleware";

import {
  createPlanCtrl,
  deletePlanCtrl,
  listPlansCtrl,
  updatePlanCtrl,
} from "../controllers/planController";

const router = Router();

router.use(authMiddleware);
router.use(requireAuthenticatedUser);
router.get("/", listPlansCtrl);
router.post("/", requirePlatformRoles(["super_admin", "developer"]), createPlanCtrl);
router.put("/:id", requirePlatformRoles(["super_admin", "developer"]), updatePlanCtrl);
router.delete("/:id", requirePlatformRoles(["super_admin", "developer"]), deletePlanCtrl);

export default router;
