// backend-api/src/services/flowEngine.ts

import axios from "axios";
import { query } from "../config/db";
import { routeMessage, GenericMessage } from "./messageRouter";

const MAX_RETRY_LIMIT = 3;
const AGENT_TIMEOUT_MS = 10 * 60 * 1000;

const processingLocks: Set<string> = new Set(); 
const ESCAPE_KEYWORDS = ["end", "exit", "stop", "cancel", "quit"];
const RESET_KEYWORDS = ["reset", "restart", "home", "menu", "start"];

const globalAny: any = global;
if (!globalAny.activeReminders) globalAny.activeReminders = new Map<string, NodeJS.Timeout>();
if (!globalAny.activeTimeouts) globalAny.activeTimeouts = new Map<string, NodeJS.Timeout>();

const activeReminders = globalAny.activeReminders;
const activeTimeouts = globalAny.activeTimeouts;

export const clearUserTimers = (botId: string, from: string) => {
  const key = `${botId}_${from}`;
  if (activeReminders.has(key)) clearTimeout(activeReminders.get(key)!);
  if (activeTimeouts.has(key)) clearTimeout(activeTimeouts.get(key)!);
  activeReminders.delete(key);
  activeTimeouts.delete(key);
};

const replaceVariables = (text: string, variables: any) => {
  if (!text) return "";
  return text.replace(/{{(\w+)}}/g, (_, key) => {
    return variables && variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
};

const validators: Record<string, (v: string, pattern?: any) => boolean> = {
  text: (v: string) => v.trim().length > 0,
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v: string) => /^[0-9+\-() ]{6,15}$/.test(v),
  number: (v: string) => !isNaN(Number(v)),
  date: (v: string) => !isNaN(Date.parse(v)),
  regex: (v: string, pattern?: any) => new RegExp(pattern || "").test(v)
};

const isInputNode = (t: string) => t === "input" || t === "menu_button" || t === "menu_list";

const handleValidationError = async (conv: any, lastNode: any) => {
  const currentRetries = (conv.retry_count || 0) + 1;
  
  if (currentRetries >= (lastNode.data?.maxRetries || MAX_RETRY_LIMIT)) {
    await query("UPDATE conversations SET retry_count = 0 WHERE id = $1", [conv.id]);
    const limitEdge = lastNode.edges?.find((e: any) => String(e.sourceHandle) === "limit" && String(e.source) === String(lastNode.id));
    if (limitEdge) return { step: limitEdge.target }; 

    const errorNodeRes = await query("SELECT flow_json FROM flows WHERE bot_id = $1", [conv.bot_id]);
    const globalHandler = errorNodeRes.rows[0]?.flow_json?.nodes?.find((n: any) => n.type === "error_handler");
    return { step: globalHandler ? globalHandler.id : null };
  }

  await query("UPDATE conversations SET retry_count = $1 WHERE id = $2", [currentRetries, conv.id]);
  
  const errorMsg: GenericMessage = { type: "text", text: lastNode.data?.onInvalidMessage || "Invalid input. Please try again." };
  return { step: "stay", message: errorMsg }; 
};

export const executeFlowFromNode = async (
  startNode: any, 
  convId: string, 
  botId: string, 
  platformUserId: string, 
  nodes: any[], 
  edges: any[], 
  channel: string, 
  io: any
): Promise<GenericMessage[]> => {
  const lockKey = `${botId}_${platformUserId}`;
  if (processingLocks.has(lockKey)) return [];
  processingLocks.add(lockKey);

  const generatedActions: GenericMessage[] = [];

  try {
    let currentNode = startNode;
    let loop = 0;
    
    const convRes = await query("SELECT variables FROM conversations WHERE id = $1", [convId]);
    let vars = convRes.rows[0]?.variables || {};

    while (currentNode && loop < 25) {
      loop++;
      console.log(`📍 [Engine][Bot:${botId}] Node Hit: ${currentNode.type} (${currentNode.id})`);
      const data = currentNode.data || {};
      let payload: GenericMessage | null = null;

      // 1. HANDOFF LOGIC
      if (currentNode.type === "assign_agent") {
        await query("UPDATE conversations SET status = 'agent_pending' WHERE id = $1", [convId]);
        payload = { type: "system", text: data.text || "Bot paused. An agent will be with you shortly." };
        
        clearUserTimers(botId, platformUserId);
        const timerKey = `${botId}_${platformUserId}`;
        activeTimeouts.set(timerKey, setTimeout(async () => {
            await query("UPDATE conversations SET status = 'active', current_node = NULL WHERE id = $1", [convId]);
            const timeoutMsg: GenericMessage = { type: "system", text: "Agent session ended due to inactivity. The bot has resumed." };
            await routeMessage(convId, timeoutMsg, io); // <-- UPDATED
        }, AGENT_TIMEOUT_MS));
      }
      else if (currentNode.type === "resume_bot") {
        await query("UPDATE conversations SET status = 'active' WHERE id = $1", [convId]);
        payload = { type: "system", text: data.text || "Automation resumed." };
        clearUserTimers(botId, platformUserId); 
      }
      
      // 2. MESSAGING LOGIC
      else if (currentNode.type === "msg_text" || currentNode.type === "input") {
        let text = replaceVariables(data.text || data.label || "...", vars);
        if (currentNode.type === "input") text += "\n\n_(Type 'reset' to restart)_";
        payload = { type: "text", text: text };
      }
      else if (currentNode.type === "error_handler") {
        payload = { type: "text", text: data.text || "Too many invalid attempts. Session reset." };
        await query("UPDATE conversations SET current_node = NULL, variables = '{}', retry_count = 0 WHERE id = $1", [convId]); 
      }
      else if (currentNode.type === "end") {
        payload = { type: "text", text: data.text || "Session completed." };
        await query("UPDATE conversations SET current_node = NULL, variables = '{}', retry_count = 0 WHERE id = $1", [convId]);
        if (payload) generatedActions.push(payload);
        break;
      }
      else if (currentNode.type === "menu_button" || currentNode.type === "menu_list") {
        payload = {
          type: "interactive",
          text: replaceVariables(data.text || "Choose an option:", vars),
          buttons: [
            data.item1 && { id: "item1", title: data.item1.substring(0, 20) },
            data.item2 && { id: "item2", title: data.item2.substring(0, 20) },
            data.item3 && { id: "item3", title: data.item3.substring(0, 20) },
            data.item4 && { id: "item4", title: data.item4.substring(0, 20) }
          ].filter(b => b)
        };
      }

      // 3. SYSTEM LOGIC
      else if (currentNode.type === "delay") {
        const delayMs = (data.delay || 1) * 1000;
        await new Promise(res => setTimeout(res, delayMs));
      }
      else if (currentNode.type === "api") {
        try {
          const apiUrl = replaceVariables(data.url, vars);
          const response = await axios({ method: data.method || "GET", url: apiUrl });
          if (data.saveTo) {
            vars[data.saveTo] = response.data; 
            await query("UPDATE conversations SET variables=$1 WHERE id=$2", [JSON.stringify(vars), convId]);
          }
        } catch (err: any) {
          console.error(`⚠️ API Node Failed (${currentNode.id}):`, err.message);
        }
      }
      else if (currentNode.type === "condition") {
        const { variable, operator, value } = data;
        const userVal = vars[variable] || "";
        let isTrue = false;
        
        if (operator === "equals") isTrue = String(userVal).toLowerCase() === String(value).toLowerCase();
        else if (operator === "contains") isTrue = String(userVal).toLowerCase().includes(String(value).toLowerCase());
        else if (operator === "exists") isTrue = userVal !== undefined && userVal !== "";

        const matchedHandle = isTrue ? "true" : "false";
        let edge = edges.find((e: any) => String(e.source) === String(currentNode.id) && String(e.sourceHandle) === matchedHandle);
        currentNode = nodes.find((n: any) => String(n.id) === String(edge?.target));
        await query("UPDATE conversations SET current_node = $1 WHERE id = $2", [currentNode?.id || null, convId]);
        continue; 
      }

      if (payload) {
         generatedActions.push(payload);
      }

      await query("UPDATE conversations SET current_node = $1 WHERE id = $2", [currentNode.id, convId]);

      if (isInputNode(currentNode.type)) {
        clearUserTimers(botId, platformUserId);
        const timerKey = `${botId}_${platformUserId}`;
        const reminderDelay = (data.reminderDelay || 60) * 1000;
        const timeoutDelay = (data.timeout || 300) * 1000;

        activeReminders.set(timerKey, setTimeout(async () => {
          const reminderMsg: GenericMessage = { type: "system", text: data.reminderText || "Are you still there?" };
          await routeMessage(convId, reminderMsg, io); // <-- UPDATED

          activeTimeouts.set(timerKey, setTimeout(async () => {
            const timeoutEdge = edges.find((e: any) => String(e.source) === String(currentNode.id) && String(e.sourceHandle) === "timeout");
            const timeoutNode = nodes.find((n: any) => String(n.id) === String(timeoutEdge?.target));
            
            if (timeoutNode) {
                const actions = await executeFlowFromNode(timeoutNode, convId, botId, platformUserId, nodes, edges, channel, io);
                for (const action of actions || []) {
                    await routeMessage(convId, action, io); // <-- UPDATED
                }
            } else {
                await query("UPDATE conversations SET current_node = NULL, retry_count = 0 WHERE id = $1", [convId]);
                const timeoutMsg: GenericMessage = { type: "system", text: data.timeoutFallback || "Session closed due to inactivity." };
                await routeMessage(convId, timeoutMsg, io); // <-- UPDATED
            }
          }, timeoutDelay));
        }, reminderDelay));
        break; 
      }

      let edge = edges.find((e: any) => String(e.source) === String(currentNode.id) && (!e.sourceHandle || e.sourceHandle === "response"));
      currentNode = nodes.find((n: any) => String(n.id) === String(edge?.target));
    }
    
    return generatedActions;
    
  } catch (err: any) {
    console.error("Execute Flow Error:", err.message);
    return generatedActions;
  } finally {
    processingLocks.delete(`${botId}_${platformUserId}`);
  }
};

export const processIncomingMessage = async (
    botId: string, 
    platformUserId: string, 
    userName: string, 
    incomingText: string, 
    buttonId: string, 
    io: any,
    channel: string
) => {
  try {
    const text = (incomingText || "").toLowerCase().trim();

    const botRes = await query("SELECT id, name FROM bots WHERE id = $1 AND status = 'active'", [botId]);
    if (!botRes.rows[0]) {
        console.log(`⚠️ Engine skipped: Bot ${botId} is missing or inactive.`);
        return;
    }

    // 1. Fetch or Create Contact
    let contactRes = await query("SELECT * FROM contacts WHERE platform_user_id = $1 AND bot_id = $2", [platformUserId, botId]);
    let contact = contactRes.rows[0];
    
    if (!contact) {
        const insertRes = await query(
            `INSERT INTO contacts (bot_id, platform_user_id, name) VALUES ($1, $2, $3) RETURNING *`,
            [botId, platformUserId, userName]
        );
        contact = insertRes.rows[0];
    }

    // 2. Fetch or Create Conversation Context
    let convRes = await query("SELECT * FROM conversations WHERE contact_id = $1 AND channel = $2", [contact.id, channel]);
    let conversation = convRes.rows[0];

    if (!conversation) {
        const cInsert = await query(
            `INSERT INTO conversations (bot_id, contact_id, channel, status, variables) VALUES ($1, $2, $3, 'active', '{}') RETURNING *`,
            [botId, contact.id, channel]
        );
        conversation = cInsert.rows[0];
    }

    if (text) {
      await query(`INSERT INTO messages (bot_id, conversation_id, channel, sender, platform_user_id, content) VALUES ($1, $2, $3, 'user', $4, $5)`, 
      [botId, conversation.id, channel, platformUserId, JSON.stringify({ type: "text", text: incomingText })]);
      await query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [conversation.id]);
    }

    if (ESCAPE_KEYWORDS.includes(text)) {
      clearUserTimers(botId, platformUserId);
      await query(`UPDATE conversations SET current_node = NULL, retry_count = 0, status = 'active' WHERE id = $1`, [conversation.id]);
      
      const endMsg: GenericMessage = { type: "system", text: "Conversation ended. Type a greeting to start again." };
      await routeMessage(conversation.id, endMsg, io); // <-- UPDATED
      return; 
    }

    if (conversation.status === 'agent_pending' && text !== "reset") return; 

    if (text === "reset") {
       await query("UPDATE conversations SET current_node = NULL, retry_count = 0, status = 'active' WHERE id = $1", [conversation.id]);
       return; 
    }

    clearUserTimers(botId, platformUserId);

    const fRes = await query("SELECT flow_json FROM flows WHERE bot_id = $1", [botId]);
    const flowData = fRes.rows[0]?.flow_json || { nodes: [], edges: [] };
    const nodes = flowData.nodes || [];
    const edges = flowData.edges || [];
    
    let currentNode = null;
    const isReset = RESET_KEYWORDS.includes(text);

    if (conversation.current_node && !isReset) {
      const lastNode = nodes.find((n: any) => String(n.id) === String(conversation.current_node));
      
      if (lastNode && isInputNode(lastNode.type)) {
        let isValid = false;
        let matchedHandle = "response";

        if (lastNode.type === "input") {
            const validationType = lastNode.data.validation || "text";
            const validatorFn = validators[validationType];
            isValid = validatorFn ? validatorFn(text, lastNode.data.regex) : true;
        } else {
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
          const validationResult = await handleValidationError(conversation, lastNode);
          
          if (validationResult.message) {
              await routeMessage(conversation.id, validationResult.message, io); // <-- UPDATED
          }
          if (validationResult.step === "stay") return;
          
          if (validationResult.step) {
             const targetNode = nodes.find((n:any) => String(n.id) === String(validationResult.step));
             if (targetNode) {
                 const actions = await executeFlowFromNode(targetNode, conversation.id, botId, platformUserId, nodes, edges, channel, io);
                 for (const action of actions || []) {
                     await routeMessage(conversation.id, action, io); // <-- UPDATED
                 }
             }
          }
          return;
        }

        await query("UPDATE conversations SET retry_count = 0 WHERE id = $1", [conversation.id]);
        
        if (lastNode.type === "input") {
            const v = conversation.variables || {}; 
            v[lastNode.data?.variable || "input"] = incomingText; 
            await query("UPDATE conversations SET variables=$1 WHERE id=$2", [JSON.stringify(v), conversation.id]);
        }
        
        const edge = edges.find((e: any) => String(e.source) === String(lastNode.id) && String(e.sourceHandle) === matchedHandle);
        if (edge) {
            currentNode = nodes.find((n: any) => String(n.id) === String(edge.target));
        } else {
            await query("UPDATE conversations SET current_node = NULL WHERE id=$1", [conversation.id]);
            return;
        }
      }
    }

    if (!currentNode || isReset) {
        currentNode = nodes.find((n:any) => n.type === "trigger" && n.data?.keywords?.split(",").map((k:string)=>k.trim().toLowerCase()).includes(text));
        if (!currentNode) {
            const entryNode = nodes.find((n: any) => n.type === "start");
            if (entryNode) {
                const edge = edges.find((e: any) => String(e.source) === String(entryNode.id));
                if (edge) currentNode = nodes.find((n: any) => String(n.id) === String(edge.target));
            }
        }
        if (currentNode) {
           await query("UPDATE conversations SET current_node = NULL, variables = '{}', status = 'active', retry_count = 0 WHERE id = $1", [conversation.id]);
        }
    }

    if (currentNode) {
        const actions = await executeFlowFromNode(currentNode, conversation.id, botId, platformUserId, nodes, edges, channel, io);
        for (const action of actions || []) {
            await routeMessage(conversation.id, action, io); // <-- UPDATED
        }
    }

  } catch (err: any) { 
      console.error(`🔥 [Critical][Bot:${botId}] ENGINE ERROR:`, err.message); 
  }
};