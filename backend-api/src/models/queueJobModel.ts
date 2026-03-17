// src/models/queueJobModel.ts

import { query } from "../config/db";

export async function createJob(
  type: string,
  payload: any
) {
  const res = await query(
    `
    INSERT INTO queue_jobs
    (type, status, payload)
    VALUES ($1,'pending',$2)
    RETURNING *
    `,
    [type, payload]
  );

  return res.rows[0];
}

export async function updateJobStatus(
  id: string,
  status: string
) {
  await query(
    `
    UPDATE queue_jobs
    SET status = $1
    WHERE id = $2
    `,
    [status, id]
  );
}