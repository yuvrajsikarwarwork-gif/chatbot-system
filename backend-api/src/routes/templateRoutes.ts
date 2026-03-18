import { Router } from "express";
import { 
  getTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate, 
  approveTemplate,
  launchCampaign
} from "../controllers/templateController";

const router = Router();
router.post("/launch-campaign", launchCampaign);
router.get("/", getTemplates);
router.post("/", createTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);
router.post("/approve/:id", approveTemplate);

export default router;