"use strict";
// backend-api/src/services/flowEngine.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processIncomingMessage = exports.executeFlowFromNode = exports.clearUserTimers = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../config/db");
const MAX_RETRY_LIMIT = 3;
const AGENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
/* ============================
   GLOBAL STORES & LOCKS
============================ */
// Note: In production with multiple worker nodes, consider moving locks/timers to Redis.
const processingLocks = new Set();
const ESCAPE_KEYWORDS = ["end", "exit", "stop", "cancel", "quit"];
const RESET_KEYWORDS = ["reset", "restart", "home", "menu", "start"];
const globalAny = global;
if (!globalAny.activeReminders)
    globalAny.activeReminders = new Map();
if (!globalAny.activeTimeouts)
    globalAny.activeTimeouts = new Map();
const activeReminders = globalAny.activeReminders;
const activeTimeouts = globalAny.activeTimeouts;
const clearUserTimers = (botId, from) => {
    const key = `${botId}_${from}`;
    if (activeReminders.has(key))
        clearTimeout(activeReminders.get(key));
    if (activeTimeouts.has(key))
        clearTimeout(activeTimeouts.get(key));
    activeReminders.delete(key);
    activeTimeouts.delete(key);
};
exports.clearUserTimers = clearUserTimers;
/* ============================
   HELPERS & VALIDATORS
============================ */
const replaceVariables = (text, variables) => {
    if (!text)
        return "";
    return text.replace(/{{(\w+)}}/g, (_, key) => {
        return variables && variables[key] !== undefined ? variables[key] : `{{${key}}}`;
    });
};
const validators = {
    text: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: (v) => /^[0-9+\-() ]{6,15}$/.test(v),
    number: (v) => !isNaN(Number(v)),
    date: (v) => !isNaN(Date.parse(v)),
    regex: (v, pattern) => new RegExp(pattern).test(v)
};
const isInputNode = (t) => t === "input" || t === "menu_button" || t === "menu_list";
/* ============================
   RETRY & ERROR HANDLER HELPERS
============================ */
const handleValidationError = async (lead, lastNode, from, phoneId, token) => {
    const currentRetries = (lead.retry_count || 0) + 1;
    if (currentRetries >= (lastNode.data?.maxRetries || MAX_RETRY_LIMIT)) {
        await (0, db_1.query)("UPDATE leads SET retry_count = 0 WHERE id = $1", [lead.id]);
        const limitEdge = lastNode.edges?.find((e) => String(e.sourceHandle) === "limit" && String(e.source) === String(lastNode.id));
        if (limitEdge)
            return limitEdge.target;
        const errorNodeRes = await (0, db_1.query)("SELECT flow_json FROM flows WHERE bot_id = $1", [lead.bot_id]);
        const globalHandler = errorNodeRes.rows[0]?.flow_json?.nodes?.find((n) => n.type === "error_handler");
        return globalHandler ? globalHandler.id : null;
    }
    await (0, db_1.query)("UPDATE leads SET retry_count = $1 WHERE id = $2", [currentRetries, lead.id]);
    await (0, axios_1.default)({
        method: "POST", url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        data: { messaging_product: "whatsapp", to: from, type: "text", text: { body: lastNode.data?.onInvalidMessage || "Invalid input. Please try again." } },
        headers: { Authorization: `Bearer ${token}` }
    }).catch(console.error);
    return "stay";
};
/* ============================
   CORE EXECUTION ENGINE
============================ */
const executeFlowFromNode = async (startNode, leadId, botId, from, nodes, edges, phoneId, token, botName, io) => {
    const lockKey = `${botId}_${from}`;
    if (processingLocks.has(lockKey))
        return;
    processingLocks.add(lockKey);
    try {
        let currentNode = startNode;
        let loop = 0;
        const leadRes = await (0, db_1.query)("SELECT variables, bot_id FROM leads WHERE id = $1", [leadId]);
        let vars = leadRes.rows[0]?.variables || {};
        while (currentNode && loop < 25) {
            loop++;
            console.log(`📍 [Engine][Bot:${botId}] Node Hit: ${currentNode.type} (${currentNode.id})`);
            const data = currentNode.data || {};
            let payload = null;
            // 1. HANDOFF LOGIC
            if (currentNode.type === "assign_agent") {
                await (0, db_1.query)("UPDATE leads SET bot_active = false, human_active = true WHERE id = $1", [leadId]);
                payload = { messaging_product: "whatsapp", to: from, type: "text", text: { body: data.text || "Bot paused. An agent will be with you shortly." } };
                (0, exports.clearUserTimers)(botId, from);
                const timerKey = `${botId}_${from}`;
                activeTimeouts.set(timerKey, setTimeout(async () => {
                    await (0, db_1.query)("UPDATE leads SET human_active = false, bot_active = true, last_node_id = NULL WHERE id = $1", [leadId]);
                    const timeoutMsg = "Agent session ended due to inactivity. The bot has resumed.";
                    await (0, axios_1.default)({
                        method: "POST", url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
                        data: { messaging_product: "whatsapp", to: from, type: "text", text: { body: timeoutMsg } },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(console.error);
                    // Log timeout to DB
                    await (0, db_1.query)(`INSERT INTO messages (bot_id, wa_number, message, sender, platform_user_id) VALUES ($1, $2, $3, 'system', $4)`, [botId, from, timeoutMsg, from]);
                }, AGENT_TIMEOUT_MS));
            }
            else if (currentNode.type === "resume_bot") {
                await (0, db_1.query)("UPDATE leads SET bot_active = true, human_active = false WHERE id = $1", [leadId]);
                payload = { messaging_product: "whatsapp", to: from, type: "text", text: { body: data.text || "Automation resumed." } };
                (0, exports.clearUserTimers)(botId, from);
            }
            // 2. MESSAGING LOGIC
            else if (currentNode.type === "msg_text" || currentNode.type === "input") {
                let text = replaceVariables(data.text || data.label || "...", vars);
                if (currentNode.type === "input")
                    text += "\n\n_(Type 'reset' to restart)_";
                payload = { messaging_product: "whatsapp", to: from, type: "text", text: { body: text } };
            }
            else if (currentNode.type === "error_handler") {
                payload = { messaging_product: "whatsapp", to: from, type: "text", text: { body: data.text || "Too many invalid attempts. Session reset." } };
                await (0, db_1.query)("UPDATE leads SET last_node_id = NULL, variables = '{}', retry_count = 0 WHERE id = $1", [leadId]);
            }
            else if (currentNode.type === "end") {
                payload = { messaging_product: "whatsapp", to: from, type: "text", text: { body: data.text || "Session completed." } };
                await (0, db_1.query)("UPDATE leads SET last_node_id = NULL, variables = '{}', retry_count = 0 WHERE id = $1", [leadId]);
                break;
            }
            else if (currentNode.type === "menu_button" || currentNode.type === "menu_list") {
                payload = {
                    messaging_product: "whatsapp", to: from, type: "interactive",
                    interactive: {
                        type: "button",
                        body: { text: replaceVariables(data.text || "Choose an option:", vars) },
                        action: {
                            buttons: [
                                data.item1 && { type: "reply", reply: { id: "item1", title: data.item1.substring(0, 20) } },
                                data.item2 && { type: "reply", reply: { id: "item2", title: data.item2.substring(0, 20) } },
                                data.item3 && { type: "reply", reply: { id: "item3", title: data.item3.substring(0, 20) } },
                                data.item4 && { type: "reply", reply: { id: "item4", title: data.item4.substring(0, 20) } }
                            ].filter((b) => b)
                        }
                    }
                };
            }
            // 3. SYSTEM LOGIC (API, CONDITION, DELAY)
            else if (currentNode.type === "delay") {
                const delayMs = (data.delay || 1) * 1000;
                await new Promise(res => setTimeout(res, delayMs));
            }
            else if (currentNode.type === "api") {
                try {
                    const apiUrl = replaceVariables(data.url, vars);
                    const response = await (0, axios_1.default)({ method: data.method || "GET", url: apiUrl });
                    if (data.saveTo) {
                        vars[data.saveTo] = response.data;
                        await (0, db_1.query)("UPDATE leads SET variables=$1 WHERE id=$2", [JSON.stringify(vars), leadId]);
                    }
                }
                catch (err) {
                    console.error(`⚠️ API Node Failed (${currentNode.id}):`, err.message);
                }
            }
            else if (currentNode.type === "condition") {
                const { variable, operator, value } = data;
                const userVal = vars[variable] || "";
                let isTrue = false;
                if (operator === "equals")
                    isTrue = String(userVal).toLowerCase() === String(value).toLowerCase();
                else if (operator === "contains")
                    isTrue = String(userVal).toLowerCase().includes(String(value).toLowerCase());
                else if (operator === "exists")
                    isTrue = userVal !== undefined && userVal !== "";
                const matchedHandle = isTrue ? "true" : "false";
                let edge = edges.find((e) => String(e.source) === String(currentNode.id) && String(e.sourceHandle) === matchedHandle);
                currentNode = nodes.find((n) => String(n.id) === String(edge?.target));
                await (0, db_1.query)("UPDATE leads SET last_node_id = $1 WHERE id = $2", [currentNode?.id || null, leadId]);
                continue;
            }
            // Standard Message Output
            if (payload) {
                await (0, axios_1.default)({
                    method: "POST", url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
                    data: payload, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
                }).catch(console.error);
                if (io)
                    io.emit("whatsapp_message", { botId, from: from, text: payload.text?.body || "[Interactive Element]", isBot: true });
                // Log bot reply to DB (Tenant Scoped)
                await (0, db_1.query)(`INSERT INTO messages (bot_id, wa_number, message, sender, platform_user_id) VALUES ($1, $2, $3, 'bot', $4)`, [botId, from, payload.text?.body || "[Interactive Sent]", from]);
            }
            await (0, db_1.query)("UPDATE leads SET last_node_id = $1 WHERE id = $2", [currentNode.id, leadId]);
            if (isInputNode(currentNode.type)) {
                (0, exports.clearUserTimers)(botId, from);
                const timerKey = `${botId}_${from}`;
                const reminderDelay = (data.reminderDelay || 60) * 1000;
                const timeoutDelay = (data.timeout || 300) * 1000;
                activeReminders.set(timerKey, setTimeout(async () => {
                    await (0, axios_1.default)({
                        method: "POST", url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
                        data: { messaging_product: "whatsapp", to: from, type: "text", text: { body: data.reminderText || "Are you still there?" } },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    activeTimeouts.set(timerKey, setTimeout(async () => {
                        const timeoutEdge = edges.find((e) => String(e.source) === String(currentNode.id) && String(e.sourceHandle) === "timeout");
                        const timeoutNode = nodes.find((n) => String(n.id) === String(timeoutEdge?.target));
                        if (timeoutNode) {
                            (0, exports.executeFlowFromNode)(timeoutNode, leadId, botId, from, nodes, edges, phoneId, token, botName, io);
                        }
                        else {
                            await (0, db_1.query)("UPDATE leads SET last_node_id = NULL, retry_count = 0 WHERE id = $1", [leadId]);
                            await (0, axios_1.default)({
                                method: "POST", url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
                                data: { messaging_product: "whatsapp", to: from, type: "text", text: { body: data.timeoutFallback || "Session closed due to inactivity." } },
                                headers: { Authorization: `Bearer ${token}` }
                            });
                        }
                    }, timeoutDelay));
                }, reminderDelay));
                break;
            }
            let edge = edges.find((e) => String(e.source) === String(currentNode.id) && (!e.sourceHandle || e.sourceHandle === "response"));
            currentNode = nodes.find((n) => String(n.id) === String(edge?.target));
        }
    }
    catch (err) {
        console.error("Execute Flow Error:", err.message);
    }
    finally {
        processingLocks.delete(`${botId}_${from}`);
    }
};
exports.executeFlowFromNode = executeFlowFromNode;
/* ============================
   MESSAGE INTAKE (Webhooks)
============================ */
// ✅ MULTI-TENANCY: botId injected from webhookController
const processIncomingMessage = async (botId, from, waName, incomingText, buttonId, io) => {
    try {
        const text = (incomingText || "").toLowerCase().trim();
        // 1. Fetch Tenant Credentials dynamically from DB
        const botRes = await (0, db_1.query)("SELECT id, name, wa_phone_number_id, wa_access_token FROM bots WHERE id = $1 AND status = 'active'", [botId]);
        const targetBot = botRes.rows[0];
        if (!targetBot) {
            console.log(`⚠️ Engine skipped: Bot ${botId} is missing or inactive.`);
            return;
        }
        const phoneId = targetBot.wa_phone_number_id;
        const token = targetBot.wa_access_token;
        if (!phoneId || !token) {
            console.error(`❌ Engine aborted: Missing Meta credentials for Bot ${botId}`);
            return;
        }
        // 2. Fetch Lead Status (Tenant Scoped)
        const leadCheck = await (0, db_1.query)("SELECT * FROM leads WHERE wa_number = $1 AND bot_id = $2", [from, botId]);
        let lead = leadCheck.rows[0];
        // 3. Log User Message & Update Timestamps
        if (text) {
            await (0, db_1.query)(`INSERT INTO messages (bot_id, wa_number, message, sender, platform_user_id) VALUES ($1, $2, $3, 'user', $4)`, [botId, from, incomingText, from]);
            if (lead) {
                await (0, db_1.query)(`UPDATE leads SET last_user_msg_at = NOW(), updated_at = NOW() WHERE id = $1`, [lead.id]);
            }
        }
        // 4. 🚨 THE ESCAPE HATCH (Priority #1)
        if (ESCAPE_KEYWORDS.includes(text)) {
            (0, exports.clearUserTimers)(botId, from);
            if (lead) {
                await (0, db_1.query)(`
          UPDATE leads 
          SET last_node_id = NULL, retry_count = 0, human_active = false, bot_active = true 
          WHERE id = $1`, [lead.id]);
            }
            const endMsg = "Conversation ended. Type a greeting to start again.";
            await (0, axios_1.default)({
                method: "POST", url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
                data: { messaging_product: "whatsapp", to: from, type: "text", text: { body: endMsg } },
                headers: { Authorization: `Bearer ${token}` }
            });
            const systemMsg = "User forcibly ended the conversation.";
            await (0, db_1.query)(`INSERT INTO messages (bot_id, wa_number, message, sender, platform_user_id) VALUES ($1, $2, $3, 'system', $4)`, [botId, from, systemMsg, from]);
            if (io)
                io.emit("whatsapp_message", { botId, from, text: systemMsg, isBot: true, sender: "system" });
            return;
        }
        // 5. 👤 HUMAN MODE GUARD (Priority #2)
        if (lead?.human_active && text !== "reset") {
            console.log(`👤 [Engine][Bot:${botId}] Human active for ${from}. Bot ignoring.`);
            return;
        }
        // 6. RESET LOGIC
        if (text === "reset" && lead) {
            await (0, db_1.query)("UPDATE leads SET last_node_id = NULL, retry_count = 0, human_active = false, bot_active = true WHERE id = $1", [lead.id]);
            return;
        }
        (0, exports.clearUserTimers)(botId, from);
        // 7. Ensure Lead Exists
        if (!lead) {
            const leadInsert = await (0, db_1.query)(`INSERT INTO leads(bot_id, wa_number, wa_name, variables, updated_at) 
             VALUES($1,$2,$3,'{}',NOW()) RETURNING *`, [botId, from, waName]);
            lead = leadInsert.rows[0];
        }
        // 8. Fetch Flow Logic
        const fRes = await (0, db_1.query)("SELECT flow_json FROM flows WHERE bot_id = $1", [botId]);
        const flowData = fRes.rows[0]?.flow_json || { nodes: [], edges: [] };
        const nodes = flowData.nodes || [];
        const edges = flowData.edges || [];
        let currentNode = null;
        const isReset = RESET_KEYWORDS.includes(text);
        // 9. Process Current Node State
        if (lead.last_node_id && !isReset) {
            const lastNode = nodes.find((n) => String(n.id) === String(lead.last_node_id));
            if (lastNode && isInputNode(lastNode.type)) {
                let isValid = false;
                let matchedHandle = "response";
                if (lastNode.type === "input") {
                    const type = lastNode.data.validation || "text";
                    isValid = type === "regex" ? validators.regex(text, lastNode.data.regex) : (validators[type] ? validators[type](text) : true);
                }
                else {
                    for (let i = 1; i <= 10; i++) {
                        const itemText = lastNode.data[`item${i}`];
                        if (itemText && (text === itemText.toLowerCase().trim() || buttonId === `item${i}`)) {
                            isValid = true;
                            matchedHandle = `item${i}`;
                            break;
                        }
                    }
                }
                if (!isValid) {
                    const nextStep = await handleValidationError(lead, lastNode, from, phoneId, token);
                    if (nextStep === "stay")
                        return;
                    if (nextStep) {
                        const targetNode = nodes.find((n) => String(n.id) === String(nextStep));
                        if (targetNode)
                            return (0, exports.executeFlowFromNode)(targetNode, lead.id, botId, from, nodes, edges, phoneId, token, targetBot.name, io);
                    }
                    return;
                }
                await (0, db_1.query)("UPDATE leads SET retry_count = 0 WHERE id = $1", [lead.id]);
                if (lastNode.type === "input") {
                    const v = lead.variables || {};
                    v[lastNode.data?.variable || "input"] = incomingText;
                    await (0, db_1.query)("UPDATE leads SET variables=$1 WHERE id=$2", [JSON.stringify(v), lead.id]);
                }
                const edge = edges.find((e) => String(e.source) === String(lastNode.id) && String(e.sourceHandle) === matchedHandle);
                if (edge) {
                    currentNode = nodes.find((n) => String(n.id) === String(edge.target));
                }
                else {
                    await (0, db_1.query)("UPDATE leads SET last_node_id = NULL WHERE id=$1", [lead.id]);
                    return;
                }
            }
        }
        // 10. Fallback: Find Trigger or Start Node
        if (!currentNode || isReset) {
            // Attempt keyword match first
            currentNode = nodes.find((n) => n.type === "trigger" && n.data?.keywords?.split(",").map((k) => k.trim().toLowerCase()).includes(text));
            // Fallback to generic start
            if (!currentNode) {
                const entryNode = nodes.find((n) => n.type === "start");
                if (entryNode) {
                    const edge = edges.find((e) => String(e.source) === String(entryNode.id));
                    if (edge)
                        currentNode = nodes.find((n) => String(n.id) === String(edge.target));
                }
            }
            if (currentNode) {
                await (0, db_1.query)("UPDATE leads SET last_node_id = NULL, variables = '{}', human_active = false, bot_active = true, retry_count = 0 WHERE id = $1", [lead.id]);
            }
        }
        // 11. Execute Remaining Flow
        if (currentNode) {
            await (0, exports.executeFlowFromNode)(currentNode, lead.id, botId, from, nodes, edges, phoneId, token, targetBot.name, io);
        }
    }
    catch (err) {
        console.error(`🔥 [Critical][Bot:${botId}] ENGINE ERROR:`, err.message);
    }
};
exports.processIncomingMessage = processIncomingMessage;
//# sourceMappingURL=flowService.js.map