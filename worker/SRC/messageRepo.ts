import { query } from "../adapters/dbAdapter";

const toMessageText = (message: any) =>
  message.text ||
  message.content?.text ||
  message.templateName ||
  null;

const DUPLICATE_SUPPRESSION_WINDOW_SECONDS = 300;

const hasRecentDuplicateMessage = async (
  botId: string,
  conversationId: string,
  message: any
) => {
  const sender = String(message.sender || "bot").trim() || "bot";
  const messageType = String(message.type || "text").trim() || "text";
  const text = toMessageText(message);
  const content = JSON.stringify(message);

  const res = await query(
    `
    SELECT id
    FROM messages
    WHERE bot_id = $1
      AND conversation_id = $2
      AND sender = $3
      AND message_type = $4
      AND COALESCE(text, '') = COALESCE($5, '')
      AND content = $6::jsonb
      AND created_at >= NOW() - ($7 * INTERVAL '1 second')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [
      botId,
      conversationId,
      sender,
      messageType,
      text,
      content,
      DUPLICATE_SUPPRESSION_WINDOW_SECONDS,
    ]
  );

  return Boolean(res.rows[0]);
};

export const saveMessage = async (
  botId: string,
  conversationId: string,
  message: any
) => {
  if (await hasRecentDuplicateMessage(botId, conversationId, message)) {
    return;
  }

  await query(
    `
    INSERT INTO messages (
      bot_id,
      conversation_id,
      sender,
      message_type,
      text,
      content,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `,
    [
      botId,
      conversationId,
      message.sender,
      message.type || "text",
      toMessageText(message),
      JSON.stringify(message),
    ]
  );
};

export const saveManyMessages = async (
  botId: string,
  conversationId: string,
  messages: any[]
) => {
  for (const msg of messages) {
    await saveMessage(botId, conversationId, {
      sender: msg.sender || "bot",
      ...msg,
    });
  }
};
