// src/controllers/integrationController.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  getIntegrationsService,
  getIntegrationService,
  createIntegrationService,
  updateIntegrationService,
  deleteIntegrationService,
} from "../services/integrationService";

export async function getIntegrations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getIntegrationsService(
      req.params.botId,
      req.user.user_id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getIntegration(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getIntegrationService(
      req.params.id,
      req.user.user_id
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createIntegrationCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await createIntegrationService(
      req.body.bot_id,
      req.user.user_id,
      req.body.type,
      req.body.config_json
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateIntegrationCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await updateIntegrationService(
      req.params.id,
      req.user.user_id,
      req.body.config_json
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteIntegrationCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await deleteIntegrationService(
      req.params.id,
      req.user.user_id
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}