// src/models/integrationModel.ts

import { query } from "../config/db";

export async function findIntegrationsByBot(botId: string) {
  const res = await query(
    "SELECT * FROM integrations WHERE bot_id = $1",
    [botId]
  );

  return res.rows;
}

export async function findIntegrationById(id: string) {
  const res = await query(
    "SELECT * FROM integrations WHERE id = $1",
    [id]
  );

  return res.rows[0];
}

export async function createIntegration(
  botId: string,
  type: string,
  config: any
) {
  const res = await query(
    `
    INSERT INTO integrations (bot_id, type, config_json)
    VALUES ($1,$2,$3)
    RETURNING *
    `,
    [botId, type, config]
  );

  return res.rows[0];
}

export async function updateIntegration(
  id: string,
  config: any
) {
  const res = await query(
    `
    UPDATE integrations
    SET config_json = $1
    WHERE id = $2
    RETURNING *
    `,
    [config, id]
  );

  return res.rows[0];
}

export async function deleteIntegration(id: string) {
  await query(
    "DELETE FROM integrations WHERE id = $1",
    [id]
  );
}