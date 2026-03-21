// src/controllers/authController.ts

import { Request, Response, NextFunction } from "express";

import {
  registerService,
  loginService,
  getUserService,
} from "../services/authService";

import { AuthRequest } from "../middleware/authMiddleware";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password, name } = req.body;

    const data = await registerService(
      email,
      password,
      name
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    const data = await loginService(
      email,
      password
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getUserService(
      req.user.id
    );

    res.json(user);
  } catch (err) {
    next(err);
  }
}
