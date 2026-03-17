// shared-types/src/messageTypes.ts

export type SenderType =
  | "user"
  | "bot"
  | "agent"
  | "system"


export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "template"
  | "event"


export type ChannelType =
  | "website"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "api"


export interface Message {
  id: string

  conversation_id: string

  bot_id: string

  sender: SenderType

  message_type: MessageType

  content: string

  channel: ChannelType

  metadata?: Record<string, unknown>

  created_at: string
}