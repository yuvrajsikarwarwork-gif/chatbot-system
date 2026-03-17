import { Request, Response } from "express";
import { ProcessRequest, ProcessResponse } from "../types/engineTypes";
import { loadContext } from "../services/contextManager";
import { loadState, saveState } from "../state/stateManager";
import { executeFlow } from "../executors/flowExecutor";
import { logEvent } from "../services/analyticsService";


export const processMessage = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("PROCESS CALLED");
    const body = req.body as ProcessRequest;

    const ctx = await loadContext(
      body.bot_id,
      body.conversation_id,
      body.message_id
    );
    
    await logEvent(
  body.conversation_id,
  body.bot_id,
  "message_received",
  { message_id: body.message_id }
);

    const state = await loadState(
      body.conversation_id
    );

    state.last_user_message =
     ctx.message.message;

    const replies = await executeFlow(
      ctx.flow,
      state
    );

    await saveState(state);

    const response: ProcessResponse = {
      status: "ok",
      replies,
      waitingInput: false,
      waitingAgent: false
    };

    res.json(response);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      status: "error",
      replies: [],
      waitingInput: false,
      waitingAgent: false
    });

  }
};




