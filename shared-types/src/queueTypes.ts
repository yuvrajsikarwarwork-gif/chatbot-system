// shared-types/src/queueTypes.ts

export type QueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retry"


export type JobType =
  | "process_message"
  | "execute_flow"
  | "send_message"
  | "analytics_event"
  | "agent_handoff"


export interface QueueJob {
  id: string

  job_type: JobType

  payload: unknown

  status: QueueStatus

  retry_count: number

  created_at: string

  updated_at?: string
}