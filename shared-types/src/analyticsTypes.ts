// shared-types/src/analyticsTypes.ts

export type AnalyticsEventType =
  | "message_received"
  | "message_sent"
  | "flow_started"
  | "flow_finished"
  | "node_executed"
  | "handoff_triggered"
  | "error"


export interface AnalyticsEvent {
  id: string

  bot_id: string

  event_type: AnalyticsEventType

  event_data: Record<string, unknown> | null

  created_at: string
}