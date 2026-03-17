import { query } from "../adapters/dbAdapter";
import { logEvent } from "../services/analyticsService";

export const executeFlow = async (
  flow: any,
  state: any
) => {

  if (!flow || !flow.flow_json) {
    return [];
  }

  const flowJson = flow.flow_json;

  const nodes = flowJson.nodes;
  const edges = flowJson.edges;

  let currentNodeId =
    state.current_node_id || flowJson.startNode;

  const replies: any[] = [];

  if (state.waiting_agent) {
    return replies;
  }

  let steps = 0;

  while (steps < 20) {

    const node = nodes.find(
  (n: any) => n.id === currentNodeId
);

if (!node) break;

await logEvent(
  state.conversation_id,
  flow.bot_id,
  "node_execute",
  { nodeId: node.id, type: node.type }
);




    // ---------- MESSAGE ----------
    if (node.type === "message") {

      replies.push({
        type: "text",
        text: node.data.text
      });

    }


    // ---------- CONDITION ----------
    if (node.type === "condition") {

      const variable = node.data.variable;
      const value = node.data.value;
      const operator = node.data.operator || "equals";

      const currentValue =
        state.variables?.[variable];

      let result = false;

      if (operator === "equals") {
        result = currentValue == value;
      }

      if (operator === "not_equals") {
        result = currentValue != value;
      }

      if (operator === "contains") {
        result =
          currentValue &&
          currentValue.includes(value);
      }

      if (operator === "exists") {
        result =
          currentValue !== undefined &&
          currentValue !== null;
      }

      if (operator === "gt") {
        result = currentValue > value;
      }

      if (operator === "lt") {
        result = currentValue < value;
      }

      const edge = edges.find(
        (e: any) =>
          e.from === currentNodeId &&
          e.label === (result ? "true" : "false")
      );

      if (!edge) break;

      currentNodeId = edge.to;

      steps++;
      continue;
    }


    // ---------- INPUT ----------
    if (node.type === "input") {

      if (state.waiting_input) {

        const varName = state.input_variable;

        if (!state.variables) {
          state.variables = {};
        }

        state.variables[varName] =
          state.last_user_message;

        state.waiting_input = false;
        state.input_variable = null;

      } else {

        state.waiting_input = true;
        state.input_variable =
          node.data.variable;

        state.current_node_id =
          currentNodeId;

        break;
      }
    }


    // ---------- ACTION ----------
    if (node.type === "action") {

      const variable = node.data.variable;
      const value = node.data.value;

      if (!state.variables) {
        state.variables = {};
      }

      state.variables[variable] = value;

    }


    // ---------- HANDOFF ----------
if (node.type === "handoff") {

  state.waiting_agent = true;

  await query(
    `
    INSERT INTO agent_tickets
    (conversation_id, bot_id, status)
    VALUES ($1,$2,$3)
    `,
    [
      state.conversation_id,
      flow.bot_id,
      "open"
    ]
  );

  await logEvent(
    state.conversation_id,
    flow.bot_id,
    "handoff",
    {}
  );

  replies.push({
    type: "text",
    text: "Connecting to agent..."
  });

  state.current_node_id = currentNodeId;

  break;
}


    // ---------- END ----------
    if (node.type === "end") {
      break;
    }


    // ---------- NORMAL EDGE ----------
    const edge = edges.find(
      (e: any) => e.from === currentNodeId
    );

    if (!edge) break;

    currentNodeId = edge.to;

    steps++;
  }

  state.current_node_id = currentNodeId;

  return replies;
};