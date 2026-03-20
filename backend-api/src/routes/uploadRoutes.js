"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadController_1 = require("../controllers/uploadController");
const router = (0, express_1.Router)();
// Ensure uploads directory exists at the root of the backend project
const uploadDir = path_1.default.join(__dirname, "../../uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename to prevent overwriting
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
// ✅ STRICT FILE SANITIZATION
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "text/csv",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Invalid file type. Only CSV, JPEG, PNG, WEBP, and PDF are allowed."));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for WhatsApp compatibility
});
// ✅ MULTI-TENANCY: Lock down upload routes
router.use(authMiddleware_1.authMiddleware);
// Standard Media Upload
router.post("/", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded or invalid format" });
    }
    // Generate public URL. 
    // NOTE: Meta/WhatsApp cannot see 'localhost'. Use your ngrok/public URL here.
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        filename: req.file.filename
    });
});
// CSV Leads Upload
router.post("/csv", upload.single("file"), uploadController_1.uploadLeadsCSV);
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map