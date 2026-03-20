"use strict";
// src/middleware/validateRequest.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
function validateRequest(fields) {
    return (req, res, next) => {
        for (const field of fields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    error: `${field} required`,
                });
            }
        }
        next();
    };
}
//# sourceMappingURL=validateRequest.js.map