// shared-types/src/integrationTypes.ts

export type PlatformType =
  | "website"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "api"


export type IntegrationStatus =
  | "active"
  | "inactive"
  | "error"


export interface Integration {
  id: string

  bot_id: string

  platform: PlatformType

  access_token?: string | null

  webhook_url?: string | null

  status: IntegrationStatus

  created_at: string
}