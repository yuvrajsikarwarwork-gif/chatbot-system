import { Router } from "express";
import { 
  getBots, 
  getBot, 
  createBotCtrl, 
  updateBotCtrl, 
  deleteBotCtrl, 
  activateBotCtrl 
} from "../controllers/botController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/**
 * All bot routes are protected by authMiddleware.
 * This ensures req.user is populated for the controllers.
 */
router.use(authMiddleware);

router.get("/", getBots);
router.get("/:id", getBot);
router.post("/", createBotCtrl);
router.put("/:id", updateBotCtrl); // Unified update handler
router.delete("/:id", deleteBotCtrl);
router.post("/:id/activate", activateBotCtrl);

export default router;