// src/routes/authRoutes.ts

import { Router } from "express";

import {
  login,
  register,
  me,
} from "../controllers/authController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", login);
router.post("/register", register);

router.get("/me", authMiddleware, me);

export default router;