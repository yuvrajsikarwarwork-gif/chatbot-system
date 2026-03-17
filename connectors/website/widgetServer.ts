import express from "express";
import { websiteAdapter } from "./websiteAdapter";
import { sendIncomingMessage } from "../common/backendClient";

const router = express.Router();

router.post("/message", async (req, res) => {
  const { bot_id, user, message } = req.body;

  const normalized = websiteAdapter(bot_id, user, message);

  await sendIncomingMessage(normalized);

  res.json({ ok: true });
});

export default router;