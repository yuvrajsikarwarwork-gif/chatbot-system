"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processIncomingMessage = exports.executeFlowFromNode = exports.clearUserTimers = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../config/db");
const MAX_RETRY_LIMIT = 3;
const processingLocks = new Set();
const ESCAPE_KEYWORDS = ["end", "exit", "stop", "cancel", "quit"];
const RESET_KEYWORDS = ["reset", "restart", "home", "menu", "start"];
const globalAny = global;
if (!globalAny.activeReminders) {
    globalAny.activeReminders = new Map();
}
if (!globalAny.activeTimeouts) {
    globalAny.activeTimeouts = new Map();
}
const activeReminders = globalAny.activeReminders;
const activeTimeouts = globalAny.activeTimeouts;
const clearUserTimers = (botId, platformUserId) => {
    const key = `${botId}_${platformUserId}`;
    if (activeReminders.has(key)) {
        clearTimeout(activeReminders.get(key));
    }
    if (activeTimeouts.has(key)) {
        clearTimeout(activeTimeouts.get(key));
    }
    activeReminders.delete(key);
    activeTimeouts.delete(key);
};
exports.clearUserTimers = clearUserTimers;
const replaceVariables = (text, variables) => {
    if (!text) {
        return "";
    }
    return text.replace(/{{(\w+)}}/g, (_, key) => {
        return variables?.[key] ?? `{{${key}}}`;
    });
};
const validators = {
    text: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: (v) => /^[0-9+\-() ]{6,15}$/.test(v),
    number: (v) => !isNaN(Number(v)),
    date: (v) => !isNaN(Date.parse(v)),
    regex: (v, pattern) => {
        try {
            return new RegExp(pattern || "").test(v);
        }
        catch {
            return false;
        }
    },
};
const isInputNode = (type) => ["input", "menu_button", "menu_list"].includes(type);
const parseVariables = (value) => {
    if (!value) {
        return {};
    }
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        }
        catch {
            return {};
        }
    }
    if (typeof value === "object") {
        return value;
    }
    return {};
};
const handleValidationError = async (conversation, lastNode) => {
    const currentRetries = (conversation.retry_count || 0) + 1;
    if (currentRetries >= (lastNode.data?.maxRetries || MAX_RETRY_LIMIT)) {
        await (0, db_1.query)("UPDATE conversations SET retry_count = 0 WHERE id = $1", [
            conversation.id,
        ]);
        const limitEdge = lastNode.edges?.find((edge) => String(edge.sourceHandle) === "limit" &&
            String(edge.source) === String(lastNode.id));
        if (limitEdge) {
            return { step: limitEdge.target };
        }
        const errorNodeRes = await (0, db_1.query)("SELECT flow_json FROM flows WHERE bot_id = $1", [conversation.bot_id]);
        const globalHandler = errorNodeRes.rows[0]?.flow_json?.nodes?.find((node) => node.type === "error_handler");
        return {
            step: globalHandler ? globalHandler.id : null,
        };
    }
    await (0, db_1.query)("UPDATE conversations SET retry_count = $1 WHERE id = $2", [
        currentRetries,
        conversation.id,
    ]);
    return {
        step: "stay",
        message: {
            type: "text",
            text: lastNode.data?.onInvalidMessage || "Invalid input. Please try again.",
        },
    };
};
const executeFlowFromNode = async (startNode, conversationId, botId, platformUserId, nodes, edges, channel, io) => {
    const lockKey = `${botId}_${platformUserId}`;
    if (processingLocks.has(lockKey)) {
        return [];
    }
    processingLocks.add(lockKey);
    const generatedActions = [];
    try {
        let currentNode = startNode;
        let loop = 0;
        const conversationRes = await (0, db_1.query)("SELECT variables FROM conversations WHERE id = $1", [conversationId]);
        let variables = parseVariables(conversationRes.rows[0]?.variables);
        while (currentNode && loop < 25) {
            loop++;
            const data = currentNode.data || {};
            let payload = null;
            if (currentNode.type === "assign_agent") {
                await (0, db_1.query)("UPDATE conversations SET status = 'agent_pending' WHERE id = $1", [conversationId]);
                payload = {
                    type: "system",
                    text: data.text || "Bot paused. An agent will be with you shortly.",
                };
                (0, exports.clearUserTimers)(botId, platformUserId);
            }
            else if (currentNode.type === "resume_bot") {
                await (0, db_1.query)("UPDATE conversations SET status = 'active' WHERE id = $1", [conversationId]);
                payload = {
                    type: "system",
                    text: data.text || "Automation resumed.",
                };
                (0, exports.clearUserTimers)(botId, platformUserId);
            }
            else if (currentNode.type === "msg_text" ||
                currentNode.type === "input") {
                let text = replaceVariables(data.text || data.label || "...", variables);
                if (currentNode.type === "input") {
                    text += "\n\n_(Type 'reset' to restart)_";
                }
                payload = {
                    type: "text",
                    text,
                };
            }
            else if (currentNode.type === "error_handler") {
                payload = {
                    type: "text",
                    text: data.text || "Too many invalid attempts. Session reset.",
                };
                await (0, db_1.query)("UPDATE conversations SET current_node = NULL, variables = '{}'::jsonb, retry_count = 0 WHERE id = $1", [conversationId]);
            }
            else if (currentNode.type === "end") {
                payload = {
                    type: "text",
                    text: data.text || "Session completed.",
                };
                await (0, db_1.query)("UPDATE conversations SET current_node = NULL, variables = '{}'::jsonb, retry_count = 0 WHERE id = $1", [conversationId]);
                generatedActions.push(payload);
                break;
            }
            else if (currentNode.type === "menu_button" ||
                currentNode.type === "menu_list") {
                payload = {
                    type: "interactive",
                    text: replaceVariables(data.text || "Choose an option:", variables),
                    buttons: [
                        data.item1 && { id: "item1", title: data.item1.substring(0, 20) },
                        data.item2 && { id: "item2", title: data.item2.substring(0, 20) },
                        data.item3 && { id: "item3", title: data.item3.substring(0, 20) },
                        data.item4 && { id: "item4", title: data.item4.substring(0, 20) },
                    ].filter(Boolean),
                };
            }
            else if (currentNode.type === "api") {
                try {
                    const apiUrl = replaceVariables(data.url, variables);
                    const response = await (0, axios_1.default)({
                        method: data.method || "GET",
                        url: apiUrl,
                    });
                    if (data.saveTo) {
                        variables[data.saveTo] = response.data;
                        await (0, db_1.query)("UPDATE conversations SET variables = $1::jsonb WHERE id = $2", [JSON.stringify(variables), conversationId]);
                    }
                }
                catch (err) {
                    console.error("API node error");
                }
            }
            else if (currentNode.type === "condition") {
                const { variable, operator, value } = data;
                const userVal = variables[variable] || "";
                let isTrue = false;
                if (operator === "equals") {
                    isTrue =
                        String(userVal).toLowerCase() === String(value).toLowerCase();
                }
                else if (operator === "contains") {
                    isTrue = String(userVal)
                        .toLowerCase()
                        .includes(String(value).toLowerCase());
                }
                else if (operator === "exists") {
                    isTrue = userVal !== undefined && userVal !== "";
                }
                const matchedHandle = isTrue ? "true" : "false";
                const edge = edges.find((candidate) => String(candidate.source) === String(currentNode.id) &&
                    String(candidate.sourceHandle) === matchedHandle);
                currentNode = nodes.find((node) => String(node.id) === String(edge?.target));
                await (0, db_1.query)("UPDATE conversations SET current_node = $1 WHERE id = $2", [currentNode?.id || null, conversationId]);
                continue;
            }
            if (payload) {
                generatedActions.push(payload);
            }
            await (0, db_1.query)("UPDATE conversations SET current_node = $1 WHERE id = $2", [
                currentNode.id,
                conversationId,
            ]);
            if (isInputNode(currentNode.type)) {
                break;
            }
            const edge = edges.find((candidate) => String(candidate.source) === String(currentNode.id) &&
                (!candidate.sourceHandle || candidate.sourceHandle === "response"));
            currentNode = nodes.find((node) => String(node.id) === String(edge?.target));
        }
        return generatedActions;
    }
    catch (err) {
        console.error("Execute Flow Error:", err.message);
        return generatedActions;
    }
    finally {
        processingLocks.delete(lockKey);
    }
};
exports.executeFlowFromNode = executeFlowFromNode;
const processIncomingMessage = async (botId, platformUserId, userName, incomingText, buttonId, io, channel = "whatsapp") => {
    try {
        const text = (incomingText || "").toLowerCase().trim();
        const botRes = await (0, db_1.query)("SELECT id FROM bots WHERE id = $1 AND status = 'active'", [botId]);
        if (!botRes.rows[0]) {
            return;
        }
        let contactRes = await (0, db_1.query)("SELECT * FROM contacts WHERE platform_user_id = $1 AND bot_id = $2", [platformUserId, botId]);
        let contact = contactRes.rows[0];
        if (!contact) {
            const insertRes = await (0, db_1.query)(`INSERT INTO contacts (bot_id, platform_user_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`, [botId, platformUserId, userName]);
            contact = insertRes.rows[0];
        }
        let conversationRes = await (0, db_1.query)("SELECT * FROM conversations WHERE contact_id = $1 AND channel = $2", [contact.id, channel]);
        let conversation = conversationRes.rows[0];
        if (!conversation) {
            const insertConversationRes = await (0, db_1.query)(`INSERT INTO conversations (bot_id, contact_id, channel, status, variables)
         VALUES ($1, $2, $3, 'active', '{}'::jsonb)
         RETURNING *`, [botId, contact.id, channel]);
            conversation = insertConversationRes.rows[0];
        }
        if (text) {
            await (0, db_1.query)(`INSERT INTO messages (bot_id, conversation_id, channel, sender, platform_user_id, content)
         VALUES ($1, $2, $3, 'user', $4, $5::jsonb)`, [
                botId,
                conversation.id,
                channel,
                platformUserId,
                JSON.stringify({ type: "text", text: incomingText }),
            ]);
            await (0, db_1.query)("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [
                conversation.id,
            ]);
        }
        const outgoingActions = [];
        if (ESCAPE_KEYWORDS.includes(text)) {
            (0, exports.clearUserTimers)(botId, platformUserId);
            await (0, db_1.query)(`UPDATE conversations
         SET current_node = NULL, retry_count = 0, status = 'active'
         WHERE id = $1`, [conversation.id]);
            outgoingActions.push({
                type: "system",
                text: "Conversation ended.",
            });
            return {
                conversationId: conversation.id,
                actions: outgoingActions,
            };
        }
        if (conversation.status === "agent_pending" && text !== "reset") {
            return {
                conversationId: conversation.id,
                actions: outgoingActions,
            };
        }
        if (text === "reset") {
            await (0, db_1.query)(`UPDATE conversations
         SET current_node = NULL, retry_count = 0, status = 'active'
         WHERE id = $1`, [conversation.id]);
            return {
                conversationId: conversation.id,
                actions: outgoingActions,
            };
        }
        (0, exports.clearUserTimers)(botId, platformUserId);
        const flowRes = await (0, db_1.query)("SELECT flow_json FROM flows WHERE bot_id = $1", [
            botId,
        ]);
        const flowData = flowRes.rows[0]?.flow_json || { nodes: [], edges: [] };
        const nodes = flowData.nodes || [];
        const edges = flowData.edges || [];
        let currentNode = null;
        const isReset = RESET_KEYWORDS.includes(text);
        if (conversation.current_node && !isReset) {
            const lastNode = nodes.find((node) => String(node.id) === String(conversation.current_node));
            if (lastNode && isInputNode(lastNode.type)) {
                let isValid = false;
                let matchedHandle = "response";
                if (lastNode.type === "input") {
                    const validationType = lastNode.data.validation || "text";
                    const validatorFn = validators[validationType];
                    isValid = validatorFn
                        ? validatorFn(text, lastNode.data.regex)
                        : true;
                }
                else {
                    for (let i = 1; i <= 10; i++) {
                        const itemText = lastNode.data[`item${i}`];
                        if (itemText &&
                            (text === itemText.toLowerCase().trim() ||
                                buttonId === `item${i}`)) {
                            isValid = true;
                            matchedHandle = `item${i}`;
                            break;
                        }
                    }
                }
                if (!isValid) {
                    const validationResult = await handleValidationError(conversation, lastNode);
                    if (validationResult.message) {
                        outgoingActions.push(validationResult.message);
                    }
                    if (validationResult.step === "stay") {
                        return {
                            conversationId: conversation.id,
                            actions: outgoingActions,
                        };
                    }
                    if (validationResult.step) {
                        const targetNode = nodes.find((node) => String(node.id) === String(validationResult.step));
                        if (targetNode) {
                            const actions = await (0, exports.executeFlowFromNode)(targetNode, conversation.id, botId, platformUserId, nodes, edges, channel, io);
                            outgoingActions.push(...actions);
                        }
                    }
                    return {
                        conversationId: conversation.id,
                        actions: outgoingActions,
                    };
                }
                await (0, db_1.query)("UPDATE conversations SET retry_count = 0 WHERE id = $1", [
                    conversation.id,
                ]);
                if (lastNode.type === "input") {
                    const updatedVariables = parseVariables(conversation.variables);
                    updatedVariables[lastNode.data?.variable || "input"] = incomingText;
                    await (0, db_1.query)("UPDATE conversations SET variables = $1::jsonb WHERE id = $2", [JSON.stringify(updatedVariables), conversation.id]);
                }
                const edge = edges.find((candidate) => String(candidate.source) === String(lastNode.id) &&
                    String(candidate.sourceHandle) === matchedHandle);
                if (edge) {
                    currentNode = nodes.find((node) => String(node.id) === String(edge.target));
                }
                else {
                    await (0, db_1.query)("UPDATE conversations SET current_node = NULL WHERE id = $1", [conversation.id]);
                    return {
                        conversationId: conversation.id,
                        actions: outgoingActions,
                    };
                }
            }
        }
        if (!currentNode || isReset) {
            currentNode = nodes.find((node) => node.type === "trigger" &&
                node.data?.keywords
                    ?.split(",")
                    .map((keyword) => keyword.trim().toLowerCase())
                    .includes(text));
            if (!currentNode) {
                const entryNode = nodes.find((node) => node.type === "start");
                if (entryNode) {
                    const edge = edges.find((candidate) => String(candidate.source) === String(entryNode.id));
                    if (edge) {
                        currentNode = nodes.find((node) => String(node.id) === String(edge.target));
                    }
                }
            }
            if (currentNode) {
                await (0, db_1.query)(`UPDATE conversations
           SET current_node = NULL, variables = '{}'::jsonb, status = 'active', retry_count = 0
           WHERE id = $1`, [conversation.id]);
            }
        }
        if (currentNode) {
            const actions = await (0, exports.executeFlowFromNode)(currentNode, conversation.id, botId, platformUserId, nodes, edges, channel, io);
            outgoingActions.push(...actions);
        }
        return {
            conversationId: conversation.id,
            actions: outgoingActions,
        };
    }
    catch (err) {
        console.error("ENGINE ERROR:", err.message);
    }
};
exports.processIncomingMessage = processIncomingMessage;
//# sourceMappingURL=flowEngine.js.map