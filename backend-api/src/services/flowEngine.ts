import axios from "axios";
import { query } from "../config/db";
import { GenericMessage } from "./messageRouter";

const MAX_RETRY_LIMIT = 3;

const processingLocks: Set<string> = new Set();

const ESCAPE_KEYWORDS = ["end", "exit", "stop", "cancel", "quit"];
const RESET_KEYWORDS = ["reset", "restart", "home", "menu", "start"];

const globalAny: any = global;

if (!globalAny.activeReminders)
  globalAny.activeReminders = new Map<string, NodeJS.Timeout>();

if (!globalAny.activeTimeouts)
  globalAny.activeTimeouts = new Map<string, NodeJS.Timeout>();

const activeReminders = globalAny.activeReminders;
const activeTimeouts = globalAny.activeTimeouts;

export const clearUserTimers = (botId: string, from: string) => {
  const key = `${botId}_${from}`;

  if (activeReminders.has(key))
    clearTimeout(activeReminders.get(key)!);

  if (activeTimeouts.has(key))
    clearTimeout(activeTimeouts.get(key)!);

  activeReminders.delete(key);
  activeTimeouts.delete(key);
};

const replaceVariables = (text: string, variables: any) => {
  if (!text) return "";

  return text.replace(/{{(\w+)}}/g, (_, key) => {
    return variables?.[key] ?? `{{${key}}}`;
  });
};

const validators: Record<string, (v: string, pattern?: any) => boolean> = {
  text: (v) => v.trim().length > 0,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^[0-9+\-() ]{6,15}$/.test(v),
  number: (v) => !isNaN(Number(v)),
  date: (v) => !isNaN(Date.parse(v)),
  regex: (v, pattern) => {
    try {
      return new RegExp(pattern || "").test(v);
    } catch {
      return false;
    }
  },
};

const isInputNode = (t: string) =>
  ["input", "menu_button", "menu_list"].includes(t);





/* ============================
   VALIDATION ERROR
============================ */

const handleValidationError = async (
  conv: any,
  lastNode: any
) => {
  const currentRetries = (conv.retry_count || 0) + 1;

  if (currentRetries >= (lastNode.data?.maxRetries || MAX_RETRY_LIMIT)) {

    await query(
      "UPDATE conversations SET retry_count = 0 WHERE id = $1",
      [conv.id]
    );

    const limitEdge = lastNode.edges?.find(
      (e: any) =>
        String(e.sourceHandle) === "limit" &&
        String(e.source) === String(lastNode.id)
    );

    if (limitEdge)
      return { step: limitEdge.target };

    const errorNodeRes = await query(
      "SELECT flow_json FROM flows WHERE bot_id = $1",
      [conv.bot_id]
    );

    const globalHandler =
      errorNodeRes.rows[0]?.flow_json?.nodes?.find(
        (n: any) => n.type === "error_handler"
      );

    return {
      step: globalHandler ? globalHandler.id : null,
    };
  }

  await query(
    "UPDATE conversations SET retry_count = $1 WHERE id = $2",
    [currentRetries, conv.id]
  );

  const errorMsg: GenericMessage = {
    type: "text",
    text:
      lastNode.data?.onInvalidMessage ||
      "Invalid input. Please try again.",
  };

  return {
    step: "stay",
    message: errorMsg,
  };
};





/* ============================
   EXECUTE FLOW
============================ */

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

  if (processingLocks.has(lockKey))
    return [];

  processingLocks.add(lockKey);

  const generatedActions: GenericMessage[] = [];

  try {

    let currentNode = startNode;
    let loop = 0;

    const convRes = await query(
      "SELECT variables FROM conversations WHERE id = $1",
      [convId]
    );

    let vars =
      convRes.rows[0]?.variables
        ? JSON.parse(convRes.rows[0].variables)
        : {};



    while (currentNode && loop < 25) {

      loop++;

      const data = currentNode.data || {};

      let payload: GenericMessage | null = null;



      /* ---------- AGENT ---------- */

      if (currentNode.type === "assign_agent") {

        await query(
          "UPDATE conversations SET status = 'agent_pending' WHERE id = $1",
          [convId]
        );

        payload = {
          type: "system",
          text:
            data.text ||
            "Bot paused. An agent will be with you shortly.",
        };

        clearUserTimers(botId, platformUserId);
      }

      else if (currentNode.type === "resume_bot") {

        await query(
          "UPDATE conversations SET status = 'active' WHERE id = $1",
          [convId]
        );

        payload = {
          type: "system",
          text:
            data.text ||
            "Automation resumed.",
        };

        clearUserTimers(botId, platformUserId);
      }



      /* ---------- TEXT ---------- */

      else if (
        currentNode.type === "msg_text" ||
        currentNode.type === "input"
      ) {

        let text = replaceVariables(
          data.text || data.label || "...",
          vars
        );

        if (currentNode.type === "input")
          text += "\n\n_(Type 'reset' to restart)_";

        payload = {
          type: "text",
          text,
        };
      }



      /* ---------- ERROR ---------- */

      else if (currentNode.type === "error_handler") {

        payload = {
          type: "text",
          text:
            data.text ||
            "Too many invalid attempts. Session reset.",
        };

        await query(
          "UPDATE conversations SET current_node = NULL, variables = '{}', retry_count = 0 WHERE id = $1",
          [convId]
        );
      }



      /* ---------- END ---------- */

      else if (currentNode.type === "end") {

        payload = {
          type: "text",
          text:
            data.text ||
            "Session completed.",
        };

        await query(
          "UPDATE conversations SET current_node = NULL, variables = '{}', retry_count = 0 WHERE id = $1",
          [convId]
        );

        if (payload)
          generatedActions.push(payload);

        break;
      }



      /* ---------- BUTTON ---------- */

      else if (
        currentNode.type === "menu_button" ||
        currentNode.type === "menu_list"
      ) {

        payload = {
          type: "interactive",
          text: replaceVariables(
            data.text ||
              "Choose an option:",
            vars
          ),
          buttons: [
            data.item1 && {
              id: "item1",
              title:
                data.item1.substring(
                  0,
                  20
                ),
            },
            data.item2 && {
              id: "item2",
              title:
                data.item2.substring(
                  0,
                  20
                ),
            },
            data.item3 && {
              id: "item3",
              title:
                data.item3.substring(
                  0,
                  20
                ),
            },
            data.item4 && {
              id: "item4",
              title:
                data.item4.substring(
                  0,
                  20
                ),
            },
          ].filter(Boolean),
        };
      }



      /* ---------- API ---------- */

      else if (currentNode.type === "api") {

        try {

          const apiUrl = replaceVariables(
            data.url,
            vars
          );

          const response =
            await axios({
              method:
                data.method ||
                "GET",
              url: apiUrl,
            });

          if (data.saveTo) {

            vars[data.saveTo] =
              response.data;

            await query(
              "UPDATE conversations SET variables=$1 WHERE id=$2",
              [
                JSON.stringify(vars),
                convId,
              ]
            );
          }

        } catch (err) {
          console.error(
            "API node error"
          );
        }
      }



      /* ---------- CONDITION ---------- */

      else if (
        currentNode.type ===
        "condition"
      ) {

        const {
          variable,
          operator,
          value,
        } = data;

        const userVal =
          vars[variable] || "";

        let isTrue = false;

        if (operator === "equals")
          isTrue =
            String(
              userVal
            ).toLowerCase() ===
            String(
              value
            ).toLowerCase();

        else if (
          operator ===
          "contains"
        )
          isTrue = String(
            userVal
          )
            .toLowerCase()
            .includes(
              String(
                value
              ).toLowerCase()
            );

        else if (
          operator ===
          "exists"
        )
          isTrue =
            userVal !==
              undefined &&
            userVal !== "";



        const matchedHandle =
          isTrue
            ? "true"
            : "false";

        const edge =
          edges.find(
            (e: any) =>
              String(
                e.source
              ) ===
                String(
                  currentNode.id
                ) &&
              String(
                e.sourceHandle
              ) ===
                matchedHandle
          );

        currentNode =
          nodes.find(
            (n: any) =>
              String(
                n.id
              ) ===
              String(
                edge?.target
              )
          );

        await query(
          "UPDATE conversations SET current_node = $1 WHERE id = $2",
          [
            currentNode?.id ||
              null,
            convId,
          ]
        );

        continue;
      }



      if (payload)
        generatedActions.push(
          payload
        );



      await query(
        "UPDATE conversations SET current_node = $1 WHERE id = $2",
        [
          currentNode.id,
          convId,
        ]
      );



      if (
        isInputNode(
          currentNode.type
        )
      )
        break;



      const edge =
        edges.find(
          (e: any) =>
            String(
              e.source
            ) ===
              String(
                currentNode.id
              ) &&
            (!e.sourceHandle ||
              e.sourceHandle ===
                "response")
        );

      currentNode =
        nodes.find(
          (n: any) =>
            String(
              n.id
            ) ===
            String(
              edge?.target
            )
        );
    }

    return generatedActions;

  } catch (err) {

    console.error(
      "Execute Flow Error"
    );

    return generatedActions;

  } finally {

    processingLocks.delete(
      `${botId}_${platformUserId}`
    );
  }
};