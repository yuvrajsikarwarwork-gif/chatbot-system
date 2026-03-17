// shared-types/src/conversationTypes.ts

import { ChannelType } from "./messageTypes"


export type ConversationStatus =
  | "active"
  | "closed"
  | "handoff"
  | "waiting"


export interface Conversation {
  id: string

  bot_id: string

  channel: ChannelType

  user_identifier: string

  status: ConversationStatus

  current_node?: string

  created_at: string

  updated_at?: string
}


export interface ConversationState {
  id: string

  conversation_id: string

  current_node: string | null

  context_json: Record<string, unknown> | null

  updated_at: string
}