import { Request, Response } from "express";
import * as FlowEngine from "../services/flowEngine";
import { query } from "../config/db";


/**
 * 1. Webhook Verification
 */
export const verifyWebhook = (req: Request, res: Response) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken =
    process.env.WA_VERIFY_TOKEN ||
    process.env.VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    token === verifyToken
  ) {
    console.log(
      "✅ Webhook verified"
    );

    return res
      .status(200)
      .send(challenge);
  }

  console.log(
    "❌ Verify failed"
  );

  return res.sendStatus(403);
};


/**
 * 2. Receive message
 */

export const receiveMessage = async (
  req: Request,
  res: Response
) => {

  const body = req.body;

  const io =
    req.app.get("io");

  console.log(
    "📩 Payload:",
    JSON.stringify(
      body,
      null,
      2
    )
  );

  /* SAVE LOG */

  try {

    await query(
      "INSERT INTO webhook_logs (incoming_payload) VALUES ($1)",
      [JSON.stringify(body)]
    );

  } catch (e) {

    console.log(
      "log fail"
    );

  }


  /* PARSE */

  if (
    body.object !==
    "whatsapp_business_account"
  ) {
    return res.sendStatus(404);
  }

  const entry =
    body.entry?.[0];

  const change =
    entry?.changes?.[0];

  const value =
    change?.value;

  const message =
    value?.messages?.[0];


  if (!message) {

    return res.sendStatus(200);

  }


  const from =
    message.from;

  const waName =
    value?.contacts?.[0]
      ?.profile?.name ||
    "User";


  let incomingText = "";

  let buttonId = "";


  /* TEXT */

  if (
    message.type === "text"
  ) {

    incomingText =
      (
        message.text?.body ||
        ""
      )
        .toLowerCase()
        .trim();

  }


  /* BUTTON */

  else if (
    message.type ===
    "interactive"
  ) {

    const interactive =
      message.interactive;

    buttonId =
      interactive.button_reply
        ?.id ||
      interactive.list_reply
        ?.id ||
      "";

    incomingText =
      (
        interactive.button_reply
          ?.title ||
        interactive.list_reply
          ?.title ||
        buttonId
      )
        .toLowerCase()
        .trim();

  }


  console.log(
    "MSG:",
    from,
    incomingText,
    buttonId
  );


  /* DASHBOARD */

  if (io) {

    io.emit(
      "whatsapp_message",
      {
        from,
        text: incomingText,
        isBot: false
      }
    );

  }


  /* HUMAN MODE CHECK */

  try {

    const leadRes =
      await query(
        "SELECT human_active FROM leads WHERE wa_number=$1",
        [from]
      );

    const isHuman =
      leadRes.rows[0]
        ?.human_active;


    if (isHuman) {

      const lower =
        incomingText
          .toLowerCase()
          .trim();

      if (
        lower !== "reset"
      ) {

        console.log(
          "👤 human active"
        );

        return res.sendStatus(200);

      }

    }


    /* FLOW ENGINE */

   await FlowEngine.processIncomingMessage(
  from,
  waName,
  incomingText,
  buttonId,
  io
);

  }

  catch (err: any) {

    console.log(
      "ENGINE ERROR",
      err.message
    );

    await query(
      "INSERT INTO webhook_logs (wa_number, error_message) VALUES ($1,$2)",
      [
        from,
        err.message
      ]
    );

  }


  return res.sendStatus(200);

};