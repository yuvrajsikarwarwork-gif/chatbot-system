import express from "express";
import { whatsappAdapter } from "./whatsappAdapter";
import { sendIncomingMessage } from "../common/backendClient";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const { bot_id, phone, message } = req.body;

  const normalized = whatsappAdapter(bot_id, phone, message);

  await sendIncomingMessage(normalized);

  res.sendStatus(200);
});

export default router;