import { ENV } from "../config/env";

export async function triggerLeadCaptureAfterInput(options: {
  conversationId: string;
  botId: string;
  platform?: string | null;
  variables: Record<string, any>;
  capturedVariable?: string | null;
  leadFormId?: string | null;
  linkedFieldKey?: string | null;
}) {
  if (!ENV.INTERNAL_ENGINE_SECRET) {
    return;
  }

  const url = `${String(ENV.BACKEND_API_URL).replace(/\/$/, "")}/api/leads/internal/capture`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-engine-secret": ENV.INTERNAL_ENGINE_SECRET,
      },
      body: JSON.stringify({
        conversationId: options.conversationId,
        botId: options.botId,
        platform: options.platform || "whatsapp",
        variables: options.variables || {},
        leadFormId: options.leadFormId || null,
        linkedFieldKey: options.linkedFieldKey || null,
        sourceLabel: "engine_input_capture",
        sourcePayload: {
          capturedVariable: options.capturedVariable || null,
          linkedFieldKey: options.linkedFieldKey || null,
        },
      }),
    });
  } catch (error) {
    console.error("[Engine] Lead capture hook failed:", error);
  }
}
