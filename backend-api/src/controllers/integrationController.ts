import { NextFunction, Response } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import {
  completeMetaEmbeddedSignupService,
  createMetaEmbeddedSignupSessionService,
  deleteIntegrationService,
  generateConnectionDetailsService,
  getIntegrationsService,
  resolveMetaEmbeddedSignupAppRedirect,
  updateIntegrationService,
} from "../services/integrationService";

export async function getIntegrations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { botId } = req.params;
    const userId = req.user?.id;

    if (!botId) {
      return res.status(400).json({ error: "botId is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await getIntegrationsService(botId, userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function generateConnectionDetailsCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    const { botId, platform, credentials } = req.body;

    if (!botId || !platform) {
      return res
        .status(400)
        .json({ error: "botId, platform, and credentials are required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await generateConnectionDetailsService(
      botId,
      userId,
      platform,
      credentials ?? {}
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createMetaEmbeddedSignupSessionCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    const { botId, platform, redirectUri } = req.body;

    if (!botId) {
      return res.status(400).json({ error: "botId is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await createMetaEmbeddedSignupSessionService(botId, userId, {
      platform,
      redirectUri,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function completeMetaEmbeddedSignupCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await completeMetaEmbeddedSignupService({
      userId,
      code: String(req.body?.code || "").trim(),
      state: String(req.body?.state || "").trim(),
      platform: req.body?.platform,
      accountId: req.body?.accountId,
      phoneNumberId: req.body?.phoneNumberId,
      businessId: req.body?.businessId,
      metaBusinessId: req.body?.metaBusinessId,
      name: req.body?.name,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function handleMetaEmbeddedSignupCallbackCtrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const redirectUrl = resolveMetaEmbeddedSignupAppRedirect({
      code: String(req.query?.code || "").trim() || null,
      state: String(req.query?.state || "").trim() || null,
    });
    return res.redirect(302, redirectUrl);
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
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await updateIntegrationService(id, userId, req.body.config ?? {});
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
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await deleteIntegrationService(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
