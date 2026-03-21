import { NextFunction, Request, Response } from "express";

const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 100;

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= max) {
    return res.status(429).json({ error: "Too many requests" });
  }

  current.count += 1;
  buckets.set(key, current);
  return next();
};
