import { Router } from "express";
import { inviteTeammate, updateProfile } from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Ensure all routes use authentication
router.use(authMiddleware);

router.put("/profile", updateProfile);
router.post("/invite", inviteTeammate);

// ✅ CRITICAL: This must be present for index.ts to work
export default router;