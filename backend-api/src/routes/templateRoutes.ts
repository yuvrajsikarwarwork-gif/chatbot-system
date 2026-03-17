import { Router } from "express";
import multer from "multer";
import { triggerBulkCampaign } from "../controllers/campaignController";
import { 
  createTemplate, 
  getTemplates, 
  deleteTemplate, 
  updateTemplate, 
  approveTemplate 
} from "../controllers/templateController";
import { uploadLeadsCSV } from "../controllers/uploadController";

const router = Router();
const upload = multer({ dest: "uploads/" });

// --- Template CRUD ---
router.post("/", createTemplate);
router.get("/", getTemplates);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

// --- Approval Lifecycle ---
router.patch("/:id/status", approveTemplate);

// --- Bulk Operations ---
router.post("/trigger-bulk", triggerBulkCampaign);
router.post("/upload-leads", upload.single("file"), uploadLeadsCSV);

export default router;