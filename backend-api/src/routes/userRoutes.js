"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Ensure all routes use authentication
router.use(authMiddleware_1.authMiddleware);
router.put("/profile", userController_1.updateProfile);
router.post("/invite", userController_1.inviteTeammate);
// ✅ CRITICAL: This must be present for index.ts to work
exports.default = router;
//# sourceMappingURL=userRoutes.js.map