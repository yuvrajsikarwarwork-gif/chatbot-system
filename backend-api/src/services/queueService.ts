// src/services/queueService.ts

import {
  createJob,
} from "../models/queueJobModel";

import { pushToQueue } from "../queue/queueProducer";

export async function addJob(
  job: {
    type: string;
    payload: any;
  }
) {
  const dbJob = await createJob(
    job.type,
    job.payload
  );

  await pushToQueue({
    id: dbJob.id,
    type: job.type,
    payload: job.payload,
  });

  return dbJob;
}