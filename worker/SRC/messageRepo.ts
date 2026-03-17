// worker/src/messageRepo.ts

import { query } from "../adapters/dbAdapter";


export const saveMessage = async (
  message: any
) => {
  await query(
    `
    INSERT INTO messages (
      conversation_id,
      sender,
      content,
      type,
      created_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    `,
    [
      message.conversationId,
      message.sender,
      message.content,
      message.type || "text",
    ]
  );
};


export const saveManyMessages =
  async (messages: any[]) => {
    for (const msg of messages) {
      await saveMessage(msg);
    }
  };