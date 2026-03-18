import { Router } from "express";
import { query } from "../config/db";

const router = Router();

// GET all leads
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM leads ORDER BY updated_at DESC");
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: GET chat history for a specific WhatsApp number
// This resolves the 404 error on the conversations page
router.get("/messages/:wa_number", async (req, res) => {
  const { wa_number } = req.params;
  try {
    const result = await query(
      "SELECT id, message, sender, created_at FROM messages WHERE wa_number = $1 ORDER BY created_at ASC",
      [wa_number]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a lead
router.delete("/:id", async (req, res) => {
  try {
    await query("DELETE FROM leads WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;