export type PlatformPayload = any;

export type NormalizedMessage = {
  bot_id: string;
  channel: string;
  user_identifier: string;
  message: string;
  timestamp: number;
};