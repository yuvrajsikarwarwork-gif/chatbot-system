import express from "express";
import { facebookAdapter } from "./facebookAdapter";
import { sendIncomingMessage } from "../common/backendClient";
import { sendMessengerMessage } from "./messengerService";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const { bot_id, user, message } = req.body;

  const normalized = facebookAdapter(bot_id, user, message);

  await sendIncomingMessage(normalized);

  res.sendStatus(200);
});

router.post("/responses", async (req, res) => {
  const { user_identifier, message } = req.body;

  await sendMessengerMessage(user_identifier, message);

  res.sendStatus(200);
});

export default router;