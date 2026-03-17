// shared-types/src/stateTypes.ts

export interface ConversationState {
  id: string

  conversation_id: string

  current_node: string | null

  context_json: Record<string, unknown> | null

  updated_at: string
}