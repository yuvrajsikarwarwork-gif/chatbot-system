// shared-types/src/jobTypes.ts

export type JobType =
  | "PROCESS_MESSAGE"
  | "SEND_MESSAGE"
  | "EXECUTE_FLOW"
  | "RUN_NODE"
  | "ANALYTICS_EVENT"
  | "AGENT_HANDOFF"


export type QueueJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retry"


export interface QueueJob {
  id: string

  job_type: JobType

  payload: unknown

  status: QueueJobStatus

  retry_count: number

  created_at: string

  updated_at?: string
}


export interface EngineRequest {
  bot_id: string

  conversation_id: string

  message_id?: string

  user_identifier?: string

  channel?: string

  payload?: unknown
}


export interface EngineResponse {
  success: boolean

  messages?: string[]

  next_node?: string

  end?: boolean

  error?: string
}