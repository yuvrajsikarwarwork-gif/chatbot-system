// src/services/queueService.ts

import { createJob } from "../models/queueJobModel";
import { pushToQueue } from "../queue/queueProducer";
import { findBotById } from "../models/botModel";

export async function addJob(
  botId: string,
  userId: string,
  job: {
    type: string;
    payload: any;
  }
) {
  // ✅ MULTI-TENANCY: Strict Gateway check before queuing asynchronous tasks
  const bot = await findBotById(botId);
  
  if (!bot || bot.user_id !== userId) {
    throw { status: 403, message: "Unauthorized to queue jobs for this bot" };
  }

  // ✅ INJECT SECURITY CONTEXT: Force the verified botId into the payload 
  // so the worker process cannot execute against the wrong tenant.
  const securedPayload = {
    ...job.payload,
    botId: bot.id
  };

  const dbJob = await createJob(
    job.type,
    securedPayload
  );

  await pushToQueue({
    id: dbJob.id,
    type: job.type,
    payload: securedPayload,
  });

  return dbJob;
}