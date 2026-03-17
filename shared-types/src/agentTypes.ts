// shared-types/src/agentTypes.ts

export type AgentTicketStatus =
  | "open"
  | "assigned"
  | "closed"
  | "waiting"


export interface AgentTicket {
  id: string

  conversation_id: string

  agent_id?: string | null

  status: AgentTicketStatus

  created_at: string

  closed_at?: string | null
}