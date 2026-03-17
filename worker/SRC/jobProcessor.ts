// worker/src/jobProcessor.ts

import {
  processMessage,
  processAI,
} from "./engineClient";

import {
  saveManyMessages,
} from "./messageRepo";

import {
  getState,
  updateState,
  createState,
} from "./stateRepo";

import {
  logEvent,
} from "./analyticsRepo";


export const processJob = async (
  job: any
) => {
  const type = job.job_type;
  const payload = job.payload_json;

  if (!payload) {
    const err: any = new Error(
      "Invalid payload"
    );
    err.fatal = true;
    throw err;
  }

  switch (type) {
    case "process_message":
      return handleProcessMessage(
        payload
      );

    case "ai_response":
      return handleAIResponse(
        payload
      );

    case "send_response":
      return handleSendResponse(
        payload
      );

    case "analytics_event":
      return handleAnalytics(
        payload
      );

    case "agent_handoff":
      return handleAgentHandoff(
        payload
      );

    default: {
      const err: any = new Error(
        "Unknown job type"
      );
      err.fatal = true;
      throw err;
    }
  }
};


const handleProcessMessage =
  async (payload: any) => {
    const {
      conversationId,
      botId,
      message,
    } = payload;


    let state = await getState(
      conversationId
    );

    if (!state) {
      await createState(
        conversationId,
        {}
      );

      state = {
        state_json: {},
      };
    }


    const engineRes =
      await processMessage({
        botId,
        conversationId,
        message,
        state:
          state.state_json,
      });


    if (
      engineRes.messages &&
      engineRes.messages.length
    ) {
      await saveManyMessages(
        engineRes.messages
      );
    }


    if (engineRes.newState) {
      await updateState(
        conversationId,
        engineRes.newState
      );
    }


    await logEvent({
      botId,
      conversationId,
      type: "process_message",
    });
  };


const handleAIResponse =
  async (payload: any) => {
    const {
      conversationId,
      botId,
      prompt,
    } = payload;


    const state =
      await getState(
        conversationId
      );


    const engineRes =
      await processAI({
        botId,
        conversationId,
        prompt,
        state:
          state?.state_json ||
          {},
      });


    if (
      engineRes.messages
    ) {
      await saveManyMessages(
        engineRes.messages
      );
    }


    if (
      engineRes.newState
    ) {
      await updateState(
        conversationId,
        engineRes.newState
      );
    }


    await logEvent({
      botId,
      conversationId,
      type: "ai_response",
    });
  };


const handleSendResponse =
  async (payload: any) => {
    if (
      payload.messages
    ) {
      await saveManyMessages(
        payload.messages
      );
    }

    await logEvent({
      type:
        "send_response",
    });
  };


const handleAnalytics =
  async (payload: any) => {
    await logEvent(payload);
  };


const handleAgentHandoff =
  async (payload: any) => {
    await logEvent({
      type:
        "agent_handoff",
      data: payload,
    });
  };