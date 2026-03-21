import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { query } from "../config/db";

export interface JwtPayload {
  id?: string;
  user_id?: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = header.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
    (req as AuthRequest).user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const authorizeRoles =
  (...allowedRoles: string[]): RequestHandler =>
  (req, res, next) => {
    const authReq = req as AuthRequest;

    if (!authReq.user?.role) {
      res.status(403).json({ error: "Forbidden: No role assigned" });
      return;
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      return;
    }

    next();
  };

export const botAccessGuard: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const botId = req.params.botId || req.body.botId || req.body.bot_id;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!botId) {
    res.status(400).json({ error: "botId is required" });
    return;
  }

  try {
    const ownerRes = await query(
      "SELECT id FROM bots WHERE id = $1 AND user_id = $2",
      [botId, userId]
    );

    if (ownerRes.rows.length > 0) {
      next();
      return;
    }

    const assignmentRes = await query(
      "SELECT role FROM bot_assignments WHERE bot_id = $1 AND user_id = $2",
      [botId, userId]
    );

    if (assignmentRes.rows[0]?.role === "admin") {
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    console.error("botAccessGuard Error:", err);
    res.status(500).json({ error: "Authorization check failed" });
  }
};
