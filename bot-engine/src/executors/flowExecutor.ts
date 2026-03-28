import { query } from "../adapters/dbAdapter";
import { logEvent } from "../services/analyticsService";
import { triggerLeadCaptureAfterInput } from "../services/leadCaptureService";

// Helper to inject {{variables}} into message text
const replaceVariables = (text: string, variables: any) => {
  if (!text) return "";
  return text.replace(/{{(\w+)}}/g, (_, key) => {
    return variables && variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
};

const findEdge = (edges: any[], currentNodeId: string, handle?: string | null) =>
  edges.find(
    (edge: any) =>
      (String(edge.source) === String(currentNodeId) || String(edge.from) === String(currentNodeId)) &&
      (handle
        ? String(edge.sourceHandle || edge.label || "") === String(handle)
        : !edge.sourceHandle || edge.sourceHandle === "response" || !edge.label)
  );

const parseJsonTemplate = (rawValue: any, variables: Record<string, any>) => {
  const source = String(rawValue || "").trim();
  if (!source) return null;

  const templated = replaceVariables(source, variables);
  return JSON.parse(templated);
};

const parseSuccessStatuses = (rawValue: any) => {
  const source = String(rawValue || "").trim();
  if (!source) return [200, 201, 202, 204];

  return source
    .split(",")
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value));
};

const executeApiNode = async (node: any, vars: Record<string, any>) => {
  const method = String(node.data?.method || "GET").trim().toUpperCase();
  const saveTo = String(node.data?.saveTo || "api_response").trim();
  const statusSaveTo = String(node.data?.statusSaveTo || `${saveTo}_status`).trim();
  const timeoutMs = Number(node.data?.timeoutMs || 0);
  const successStatuses = parseSuccessStatuses(node.data?.successStatuses);
  const url = replaceVariables(String(node.data?.url || "").trim(), vars);

  if (!url) {
    throw new Error("API node URL is missing");
  }

  const headers = parseJsonTemplate(node.data?.headers, vars) || {};
  const bodyValue = parseJsonTemplate(node.data?.body, vars);
  const controller =
    timeoutMs > 0 && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId =
    controller && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body:
        bodyValue !== null && !["GET", "HEAD"].includes(method)
          ? JSON.stringify(bodyValue)
          : undefined,
      signal: controller?.signal,
    });

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const responseData = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    vars[saveTo] = responseData;
    vars[statusSaveTo] = response.status;
    vars[`${saveTo}_ok`] = response.ok;
    delete vars[`${saveTo}_error`];

    return {
      matchedHandle: successStatuses.includes(response.status) ? "success" : "error",
      status: response.status,
    };
  } catch (error: any) {
    vars[saveTo] = null;
    vars[statusSaveTo] = 0;
    vars[`${saveTo}_ok`] = false;
    vars[`${saveTo}_error`] = String(error?.message || error || "Request failed");

    return {
      matchedHandle: "error",
      status: 0,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const executeFlow = async (flow: any, state: any, runtimeContext?: { platform?: string | null }) => {
  if (!flow || !flow.flow_json) return [];

  const flowJson = typeof flow.flow_json === "string" ? JSON.parse(flow.flow_json) : flow.flow_json;
  const nodes = flowJson.nodes || [];
  const edges = flowJson.edges || [];

  // Fallback to finding 'start' or 'trigger' node if no specific current_node_id exists
  let currentNodeId = state.current_node_id || flowJson.startNode || nodes.find((n: any) => n.type === 'start' || n.type === 'trigger')?.id;

  const replies: any[] = [];
  const vars = state.variables || {};

  if (state.status === "agent_pending" || state.waiting_agent) return replies;

  let steps = 0;
  const MAX_STEPS = 25; // Prevent infinite loops

  while (steps < MAX_STEPS && currentNodeId) {
    const node = nodes.find((n: any) => String(n.id) === String(currentNodeId));
    if (!node) break;

    await logEvent(state.conversation_id, flow.bot_id, "node_execute", { nodeId: node.id, type: node.type });

    // ---------- MESSAGING NODES ----------
    if (node.type === "message" || node.type === "msg_text") {
      replies.push({
        type: "text",
        text: replaceVariables(node.data.text || node.data.label || "", vars)
      });
    }

    if (node.type === "send_template") {
      replies.push({
        type: "template",
        templateName: node.data.templateName,
        languageCode: node.data.language || "en_US",
        text: replaceVariables(node.data.text || "", vars)
      });
    }

    if (node.type === "msg_media") {
      replies.push({
        type: "media",
        mediaUrl: node.data.media_url,
        text: replaceVariables(node.data.text || "", vars)
      });
    }

    if (node.type === "menu_button" || node.type === "menu_list") {
      const buttons = [];
      for (let i = 1; i <= 10; i++) {
        if (node.data[`item${i}`]) {
          buttons.push({ id: `item${i}`, title: replaceVariables(node.data[`item${i}`], vars).substring(0, 20) });
        }
      }
      replies.push({
        type: "interactive",
        text: replaceVariables(node.data.text || "Choose an option:", vars),
        buttons: buttons
      });
      
      // Stop execution and wait for user reply
      state.waiting_input = true;
      state.current_node_id = currentNodeId;
      break;
    }

    // ---------- LOGIC & DATA NODES ----------
    if (node.type === "input") {
      if (state.waiting_input) {
        // User replied, save the response
        const varName = state.input_variable || node.data.variable || "last_input";
        vars[varName] = state.last_user_message;
        await triggerLeadCaptureAfterInput({
          conversationId: state.conversation_id,
          botId: flow.bot_id,
          platform: runtimeContext?.platform || "whatsapp",
          variables: vars,
          capturedVariable: varName,
          leadFormId: node.data?.linkedFormId || null,
          linkedFieldKey: node.data?.linkedFieldKey || null,
        });
        
        state.waiting_input = false;
        state.input_variable = null;
      } else {
        // First time hitting input node, send the prompt and wait
        if (node.data.text) {
          replies.push({ type: "text", text: replaceVariables(node.data.text, vars) });
        }
        state.waiting_input = true;
        state.input_variable = node.data.variable;
        state.current_node_id = currentNodeId;
        break;
      }
    }

    if (node.type === "action" || node.type === "save") {
      const varName = node.data.variable;
      const val = node.data.value || node.data.leadField;
      if (varName) {
        vars[varName] = val;
        await triggerLeadCaptureAfterInput({
          conversationId: state.conversation_id,
          botId: flow.bot_id,
          platform: runtimeContext?.platform || "whatsapp",
          variables: vars,
          capturedVariable: varName,
        });
      }
    }

    if (node.type === "condition") {
      const variable = node.data.variable;
      const value = String(node.data.value).toLowerCase();
      const operator = node.data.operator || "equals";
      const currentValue = String(vars[variable] || "").toLowerCase();

      let result = false;
      if (operator === "equals") result = currentValue === value;
      if (operator === "not_equals") result = currentValue !== value;
      if (operator === "contains") result = currentValue.includes(value);
      if (operator === "exists") result = vars[variable] !== undefined && vars[variable] !== "";
      if (operator === "gt") result = Number(vars[variable]) > Number(node.data.value);
      if (operator === "lt") result = Number(vars[variable]) < Number(node.data.value);

      const matchedHandle = result ? "true" : "false";
      
      // Support both React Flow (source/target) and custom (from/to) edge formats
      const edge = findEdge(edges, currentNodeId, matchedHandle);

      if (!edge) break;
      currentNodeId = edge.target || edge.to;
      steps++;
      continue;
    }

    if (node.type === "api") {
      const { matchedHandle, status } = await executeApiNode(node, vars);

      await logEvent(state.conversation_id, flow.bot_id, "api_request", {
        nodeId: node.id,
        method: String(node.data?.method || "GET").toUpperCase(),
        url: replaceVariables(String(node.data?.url || ""), vars),
        status,
        matchedHandle,
      });

      const edge = findEdge(edges, currentNodeId, matchedHandle) || findEdge(edges, currentNodeId);
      if (!edge) {
        state.current_node_id = null;
        break;
      }

      currentNodeId = edge.target || edge.to;
      steps++;
      continue;
    }

    // ---------- STATE & SYSTEM NODES ----------
    if (node.type === "handoff" || node.type === "assign_agent") {
      state.waiting_agent = true;
      state.status = "agent_pending";

      await query(
        `INSERT INTO agent_tickets (conversation_id, bot_id, status) VALUES ($1,$2,$3)`,
        [state.conversation_id, flow.bot_id, "open"]
      );

      await logEvent(state.conversation_id, flow.bot_id, "handoff", {});

      replies.push({ type: "text", text: replaceVariables(node.data.text || "Connecting you to an agent...", vars) });
      state.current_node_id = currentNodeId;
      break;
    }

    if (node.type === "end") {
      state.current_node_id = null;
      state.waiting_input = false;
      break;
    }

    // ---------- STANDARD EDGE TRAVERSAL ----------
    // Find next node via default response handles
    const edge = findEdge(edges, currentNodeId);

    if (!edge) {
      // Flow reached a dead end naturally
      state.current_node_id = null;
      break; 
    }

    currentNodeId = edge.target || edge.to;
    steps++;
  }

  state.variables = vars;
  if (!state.waiting_input && !state.waiting_agent) {
    state.current_node_id = currentNodeId;
  }

  return replies;
};
