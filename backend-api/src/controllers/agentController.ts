import { Request, Response } from "express";
import { query } from "../config/db";
import axios from "axios";

const DEFAULT_PHONE_ID = process.env.PHONE_NUMBER_ID || "1030050193525162";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

export const getInboxLeads = async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT id, wa_number, wa_name, bot_active, human_active, updated_at 
      FROM leads 
      ORDER BY human_active DESC, updated_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendAgentMessage = async (req: Request, res: Response) => {
  const { wa_number, message } = req.body;
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${DEFAULT_PHONE_ID}/messages`,
      data: { messaging_product: "whatsapp", to: wa_number, type: "text", text: { body: message } },
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
};

export const resumeBotManually = async (req: Request, res: Response) => {
  const { wa_number } = req.body;
  try {
    await query(`
      UPDATE leads 
      SET human_active = false, bot_active = true, last_node_id = NULL, retry_count = 0 
      WHERE wa_number = $1
    `, [wa_number]);

    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${DEFAULT_PHONE_ID}/messages`,
      data: { messaging_product: "whatsapp", to: wa_number, type: "text", text: { body: "Agent session ended. Bot resumed." } },
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};