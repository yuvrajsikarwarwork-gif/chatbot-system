// worker/src/retryManager.ts

import {
  markRetry,
  markFailed,
} from "./queueRepo";

import { config } from "./config";


const isFatalError = (error: any) => {
  if (!error) return false;

  if (error.fatal === true) {
    return true;
  }

  return false;
};


const shouldRetry = (
  retryCount: number,
  maxRetries: number
) => {
  return retryCount < maxRetries;
};


export const handleRetry = async (
  job: any,
  error: any
) => {
  const retryCount =
    job.retry_count || 0;

  const maxRetries =
    job.max_retries ||
    config.MAX_RETRIES;


  if (isFatalError(error)) {
    await markFailed(job.id);
    return;
  }


  if (
    shouldRetry(retryCount, maxRetries)
  ) {
    await markRetry(job.id);
    return;
  }


  await markFailed(job.id);
};