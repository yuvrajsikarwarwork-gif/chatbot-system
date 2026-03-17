// shared-types/src/botTypes.ts

export type BotStatus =
  | "active"
  | "inactive"
  | "draft"


export interface Bot {
  id: string

  user_id: string

  bot_name: string

  description?: string | null

  status: BotStatus

  created_at: string

  updated_at?: string
}