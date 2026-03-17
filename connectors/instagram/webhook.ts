import express from "express";
import { instagramAdapter } from "./instagramAdapter";
import { sendIncomingMessage } from "../common/backendClient";
import { sendInstagramMessage } from "./instagramService";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const { bot_id, user, message } = req.body;

  const normalized = instagramAdapter(bot_id, user, message);

  await sendIncomingMessage(normalized);

  res.sendStatus(200);
});

router.post("/responses", async (req, res) => {
  const { user_identifier, message } = req.body;

  await sendInstagramMessage(user_identifier, message);

  res.sendStatus(200);
});

export default router;