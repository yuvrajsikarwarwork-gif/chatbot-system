// connectors/common/config.ts

export const config = {
  PORT: process.env.PORT || 4000,

  BACKEND_URL:
    process.env.BACKEND_URL || "http://localhost:3000",

  CONNECTOR_NAME:
    process.env.CONNECTOR_NAME || "connector",

  API_KEY:
    process.env.API_KEY || "dev-key",

  WHATSAPP_TOKEN:
    process.env.WHATSAPP_TOKEN || "",

  FACEBOOK_TOKEN:
    process.env.FACEBOOK_TOKEN || "",

  INSTAGRAM_TOKEN:
    process.env.INSTAGRAM_TOKEN || "",
};