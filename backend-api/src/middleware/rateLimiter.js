"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const buckets = new Map();
const rateLimiter = (req, res, next) => {
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
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map