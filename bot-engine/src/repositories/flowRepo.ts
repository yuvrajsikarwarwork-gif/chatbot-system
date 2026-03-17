import { query } from "../adapters/dbAdapter";

export const getFlowByBotId = async (botId: string) => {
  const rows = await query(
    "SELECT * FROM flows WHERE bot_id = $1",
    [botId]
  );

  return rows[0];
};