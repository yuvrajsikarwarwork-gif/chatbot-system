import { Request, Response } from "express";
import * as FlowEngine from "../services/flowEngine";
import { query } from "../config/db";

/**
 * 1. Webhook Verification
 * Note: In a multi-tenant SaaS, you typically use one Meta App. 
 * This global verify token matches your Meta App dashboard configuration.
 */
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WA_VERIFY_TOKEN || process.env.VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  console.log("❌ Verify failed");
  return res.sendStatus(403);
};

/**
 * 2. Receive message
 */
export const receiveMessage = async (req: Request, res: Response) => {
  const body = req.body;
  const io = req.app.get("io");

  // ✅ FIX 1: SILENTLY IGNORE READ RECEIPTS TO STOP TERMINAL SPAM
  if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
    return res.sendStatus(200);
  }

  // /* PARSE */
  if (body.object !== "whatsapp_business_account") {
    return res.sendStatus(404);
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return res.sendStatus(200);
  }

  // ✅ MULTI-TENANCY: Identify the destination Bot via the incoming Phone Number ID
  const phoneNumberId = value?.metadata?.phone_number_id;
  if (!phoneNumberId) return res.sendStatus(200);

  let botId: string | null = null;

  try {
    // Look up the active bot assigned to this WhatsApp Phone Number ID
    const botRes = await query(
      "SELECT id FROM bots WHERE wa_phone_number_id = $1 AND status = 'active'", 
      [phoneNumberId]
    );
    botId = botRes.rows[0]?.id;

    if (!botId) {
      console.log(`⚠️ Webhook received for unconfigured or inactive phone ID: ${phoneNumberId}`);
      return res.sendStatus(200); // 200 required to prevent Meta from retrying indefinitely
    }

    // Save Tenant-Scoped Log
    await query(
      "INSERT INTO webhook_logs (bot_id, incoming_payload) VALUES ($1, $2)", 
      [botId, JSON.stringify(body)]
    );

  } catch (err: any) {
    console.log("DB ERROR (Bot Lookup):", err.message);
    return res.sendStatus(200);
  }

  const from = message.from;
  const waName = value?.contacts?.[0]?.profile?.name || "User";

  let incomingText = "";
  let buttonId = "";

  /* TEXT */
  if (message.type === "text") {
    incomingText = (message.text?.body || "").toLowerCase().trim();
  }
  /* BUTTON OR LIST */
  else if (message.type === "interactive") {
    const interactive = message.interactive;
    buttonId = interactive.button_reply?.id || interactive.list_reply?.id || "";
    incomingText = (interactive.button_reply?.title || interactive.list_reply?.title || buttonId).toLowerCase().trim();
  }

  console.log(`MSG [Bot:${botId}]:`, from, incomingText, buttonId);

  /* DASHBOARD (Optional: Can be scoped to rooms by botId if needed) */
  if (io) {
    io.emit("whatsapp_message", {
      botId,
      from,
      text: incomingText,
      isBot: false
    });
  }

  /* HUMAN MODE CHECK */
  try {
    // ✅ MULTI-TENANCY: Scope lead lookup to the specific bot
    const leadRes = await query("SELECT human_active FROM leads WHERE wa_number=$1 AND bot_id=$2", [from, botId]);
    const isHuman = leadRes.rows[0]?.human_active;

    if (isHuman) {
      const lower = incomingText.toLowerCase().trim();
      if (lower !== "reset") {
        console.log(`👤 Human active for lead ${from} on bot ${botId}`);
        return res.sendStatus(200);
      }
    }

    /* 🔥 FIX 2: FIRE AND FORGET FLOW ENGINE 🔥 */
    // We DO NOT use 'await' here. We execute the engine in the background 
    // so we can instantly return res.sendStatus(200) to Meta below.
    FlowEngine.processIncomingMessage(
      botId,  // ✅ MULTI-TENANCY: Injected botId into the Engine
      from,
      waName,
      incomingText,
      buttonId,
      io
    ).catch(async (err: any) => {
      console.log("ENGINE ERROR", err.message);
      await query(
        "INSERT INTO webhook_logs (bot_id, wa_number, error_message) VALUES ($1,$2,$3)", 
        [botId, from, err.message]
      ).catch(() => {});
    });

  } catch (err: any) {
    console.log("DB/ROUTING ERROR", err.message);
  }

  // ✅ THIS EXECUTES INSTANTLY TO PREVENT META TIMEOUT BANS
  return res.sendStatus(200);
};