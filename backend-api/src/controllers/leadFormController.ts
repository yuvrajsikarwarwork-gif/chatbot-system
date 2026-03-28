import { NextFunction, Response } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import {
  createLeadFormService,
  deleteLeadFormService,
  getLeadFormService,
  listLeadFormsService,
  updateLeadFormService,
} from "../services/leadFormService";

function getUserId(req: AuthRequest) {
  return req.user?.id || req.user?.user_id || null;
}

function getProjectId(req: AuthRequest) {
  return typeof req.query.projectId === "string"
    ? req.query.projectId
    : typeof req.headers["x-project-id"] === "string"
      ? req.headers["x-project-id"]
      : typeof req.body?.projectId === "string"
        ? req.body.projectId
        : typeof req.body?.project_id === "string"
          ? req.body.project_id
          : "";
}

export async function listLeadFormsCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(req);
    const workspaceId =
      typeof req.query.workspaceId === "string"
        ? req.query.workspaceId
        : typeof req.headers["x-workspace-id"] === "string"
          ? req.headers["x-workspace-id"]
          : "";

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const data = await listLeadFormsService(userId, workspaceId, getProjectId(req) || null);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getLeadFormCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.params.id) {
      return res.status(400).json({ error: "id is required" });
    }

    const data = await getLeadFormService(req.params.id, userId, getProjectId(req) || null);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createLeadFormCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await createLeadFormService(userId, req.body || {});
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateLeadFormCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.params.id) {
      return res.status(400).json({ error: "id is required" });
    }

    const data = await updateLeadFormService(req.params.id, userId, req.body || {});
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteLeadFormCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.params.id) {
      return res.status(400).json({ error: "id is required" });
    }

    await deleteLeadFormService(req.params.id, userId, getProjectId(req) || null);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
