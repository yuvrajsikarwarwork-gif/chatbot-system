"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLeadsCSV = void 0;
const db_1 = require("../config/db");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
const uploadLeadsCSV = async (req, res) => {
    const { bot_id, template_id, campaign_name } = req.body;
    const file = req.file;
    if (!file)
        return res.status(400).json({ error: "No file uploaded" });
    if (!bot_id) {
        if (fs_1.default.existsSync(file.path))
            fs_1.default.unlinkSync(file.path);
        return res.status(400).json({ error: "bot_id is required" });
    }
    try {
        // ✅ MULTI-TENANCY: Verify Bot Ownership BEFORE processing
        const botRes = await (0, db_1.query)("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [bot_id, req.user.id]);
        if (botRes.rows.length === 0) {
            if (fs_1.default.existsSync(file.path))
                fs_1.default.unlinkSync(file.path);
            return res.status(403).json({ error: "Unauthorized or bot not found" });
        }
        const leads = [];
        // Parse CSV file
        fs_1.default.createReadStream(file.path)
            .pipe((0, csv_parser_1.default)())
            .on("data", (data) => leads.push(data))
            .on("end", async () => {
            try {
                console.log(`📂 Processing ${leads.length} leads from CSV for Bot ${bot_id}...`);
                for (const lead of leads) {
                    const phone = lead.phone || lead.wa_number;
                    const name = lead.name || lead.wa_name || "Unknown";
                    const email = lead.email || "";
                    if (!phone)
                        continue;
                    // 1. Upsert Lead (✅ Scoped to prevent cross-tenant overwrite)
                    await (0, db_1.query)(`INSERT INTO leads (bot_id, wa_number, wa_name, email, source, status)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (wa_number, bot_id) DO UPDATE SET wa_name = $3, email = $4`, [bot_id, phone, name, email, 'csv_upload', 'new']);
                }
                // 2. If template_id is provided, trigger the campaign logic here
                // (You can call your existing triggerBulkCampaign logic here)
                res.status(200).json({
                    message: `Successfully processed ${leads.length} leads.`,
                    count: leads.length
                });
            }
            catch (err) {
                console.error("❌ CSV Processing Error:", err);
                res.status(500).json({ error: "Failed to process CSV data" });
            }
            finally {
                if (fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path); // Clean up temp file
            }
        });
    }
    catch (error) {
        if (fs_1.default.existsSync(file.path))
            fs_1.default.unlinkSync(file.path);
        res.status(500).json({ error: "Server Error" });
    }
};
exports.uploadLeadsCSV = uploadLeadsCSV;
//# sourceMappingURL=uploadController.js.map