import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  getFlowsByBotService,
  getFlowService,
  saveFlowService,
  updateFlowService,
  deleteFlowService,
} from "../services/flowService";

export async function getFlowsByBot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { botId } = req.params;
    const userId = req.user?.id;
    if (!botId || botId === "undefined") return res.status(200).json({ nodes: [], edges: [] });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const data = await getFlowsByBotService(botId, userId);
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(200).json({ nodes: [], edges: [] });
    }
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (err: any) {
    res.status(200).json({ nodes: [], edges: [] });
  }
}

export async function getFlow(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const data = await getFlowService(id, userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * BULLETPROOF SAVE LOGIC
 * Extracts parameters and validates them before hitting the database.
 */
export async function saveFlowCtrl(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const botId = req.body.botId || req.body.bot_id;
    const flowJson = req.body.flow_json;
    const userId = req.user?.id;

    // Safety guards to prevent 500 crash
    if (!botId) return res.status(400).json({ error: "botId is missing in request." });
    if (!flowJson) return res.status(400).json({ error: "flow_json payload is missing." });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const data = await saveFlowService(botId, userId, flowJson);
    res.status(200).json(data);
  } catch (err) {
    console.error("❌ saveFlowCtrl Critical Error:", err);
    next(err);
  }
}

export async function createFlowCtrl(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!req.body.bot_id) return res.status(400).json({ error: "bot_id is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const data = await saveFlowService(req.body.bot_id, userId, req.body.flow_json);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateFlowCtrl(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const data = await updateFlowService(id, userId, req.body.flow_json);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteFlowCtrl(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    await deleteFlowService(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
