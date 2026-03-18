import { Request, Response } from "express";
import { query } from "../config/db";
import axios from "axios";

const DEFAULT_PHONE_ID = process.env.PHONE_NUMBER_ID || "1030050193525162";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

// 1. Fetch Live Inbox Leads (Added last_user_msg_at)
export const getInboxLeads = async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT id, wa_number, wa_name, bot_active, human_active, updated_at, last_user_msg_at 
      FROM leads 
      ORDER BY human_active DESC, updated_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. NEW: Fetch Chat History for a specific lead
export const getChatHistory = async (req: Request, res: Response) => {
  const { wa_number } = req.params;
  try {
    const result = await query(`
      SELECT id, message as text, sender, created_at as timestamp 
      FROM messages 
      WHERE wa_number = $1 
      ORDER BY created_at ASC
    `, [wa_number]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Send Manual Agent Message & Log it
export const sendAgentMessage = async (req: Request, res: Response) => {
  const { wa_number, message } = req.body;
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${DEFAULT_PHONE_ID}/messages`,
      data: { messaging_product: "whatsapp", to: wa_number, type: "text", text: { body: message } },
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    // Log to DB
    await query(`INSERT INTO messages (wa_number, message, sender) VALUES ($1, $2, 'agent')`, [wa_number, message]);
    await query(`UPDATE leads SET updated_at = NOW() WHERE wa_number = $1`, [wa_number]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
};

// 4. Resolve Chat & Log System Message
export const resumeBotManually = async (req: Request, res: Response) => {
  const { wa_number } = req.body;
  try {
    await query(`
      UPDATE leads 
      SET human_active = false, bot_active = true, last_node_id = NULL, retry_count = 0, updated_at = NOW()
      WHERE wa_number = $1
    `, [wa_number]);

    const systemMsg = "Agent session ended. Bot resumed.";
    
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${DEFAULT_PHONE_ID}/messages`,
      data: { messaging_product: "whatsapp", to: wa_number, type: "text", text: { body: systemMsg } },
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    // Log the System message so the dashboard sees it
    await query(`INSERT INTO messages (wa_number, message, sender) VALUES ($1, $2, 'system')`, [wa_number, systemMsg]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};