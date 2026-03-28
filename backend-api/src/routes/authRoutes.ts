// src/routes/authRoutes.ts

import { Router } from "express";

import {
  acceptInvite,
  createSupportWorkspaceSession,
  downloadWorkspaceExport,
  endSupportWorkspaceSession,
  login,
  logout,
  register,
  me,
  previewInvite,
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetOtp,
} from "../controllers/authController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/invite", previewInvite);
router.post("/accept-invite", acceptInvite);
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-password-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);
router.get("/workspace-export", downloadWorkspaceExport);

router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);
router.post("/support-session", authMiddleware, createSupportWorkspaceSession);
router.delete("/support-session", authMiddleware, endSupportWorkspaceSession);

export default router;
