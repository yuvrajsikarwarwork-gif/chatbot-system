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