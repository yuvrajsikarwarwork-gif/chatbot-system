import { db, query } from "../config/db";

export type LeadFormFieldRecord = {
  id?: string;
  fieldKey: string;
  fieldType: string;
  questionLabel: string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
};

export async function findLeadFormsByWorkspace(workspaceId: string) {
  const res = await query(
    `SELECT
       lf.id,
       lf.workspace_id,
       lf.name,
       lf.created_at,
       lf.updated_at,
       COALESCE(
         jsonb_agg(
           jsonb_build_object(
             'id', lff.id,
             'fieldKey', lff.field_key,
             'fieldType', lff.field_type,
             'questionLabel', lff.question_label,
             'options', lff.options,
             'isRequired', lff.is_required,
             'sortOrder', lff.sort_order
           )
           ORDER BY lff.sort_order ASC, lff.created_at ASC
         ) FILTER (WHERE lff.id IS NOT NULL),
         '[]'::jsonb
       ) AS fields
     FROM lead_forms lf
     LEFT JOIN lead_form_fields lff ON lff.form_id = lf.id
     WHERE lf.workspace_id = $1
     GROUP BY lf.id
     ORDER BY lf.created_at DESC`,
    [workspaceId]
  );

  return res.rows;
}

export async function findLeadFormById(id: string) {
  const res = await query(
    `SELECT
       lf.id,
       lf.workspace_id,
       lf.name,
       lf.created_at,
       lf.updated_at,
       COALESCE(
         jsonb_agg(
           jsonb_build_object(
             'id', lff.id,
             'fieldKey', lff.field_key,
             'fieldType', lff.field_type,
             'questionLabel', lff.question_label,
             'options', lff.options,
             'isRequired', lff.is_required,
             'sortOrder', lff.sort_order
           )
           ORDER BY lff.sort_order ASC, lff.created_at ASC
         ) FILTER (WHERE lff.id IS NOT NULL),
         '[]'::jsonb
       ) AS fields
     FROM lead_forms lf
     LEFT JOIN lead_form_fields lff ON lff.form_id = lf.id
     WHERE lf.id = $1
     GROUP BY lf.id
     LIMIT 1`,
    [id]
  );

  return res.rows[0] || null;
}

async function replaceLeadFormFields(
  client: any,
  formId: string,
  fields: LeadFormFieldRecord[]
) {
  await client.query(`DELETE FROM lead_form_fields WHERE form_id = $1`, [formId]);

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) {
      continue;
    }
    await client.query(
      `INSERT INTO lead_form_fields (form_id, field_key, field_type, question_label, options, is_required, sort_order)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        formId,
        field.fieldKey,
        field.fieldType,
        field.questionLabel,
        JSON.stringify(Array.isArray(field.options) ? field.options : []),
        Boolean(field.isRequired),
        Number.isFinite(field.sortOrder) ? Number(field.sortOrder) : index,
      ]
    );
  }
}

export async function createLeadForm(input: {
  workspaceId: string;
  name: string;
  fields: LeadFormFieldRecord[];
}) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO lead_forms (workspace_id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [input.workspaceId, input.name]
    );

    const formId = String(created.rows[0]?.id || "");
    await replaceLeadFormFields(client, formId, input.fields);
    await client.query("COMMIT");

    return findLeadFormById(formId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateLeadForm(input: {
  id: string;
  name: string;
  fields: LeadFormFieldRecord[];
}) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE lead_forms
       SET name = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [input.id, input.name]
    );

    await replaceLeadFormFields(client, input.id, input.fields);
    await client.query("COMMIT");

    return findLeadFormById(input.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteLeadForm(id: string) {
  await query(`DELETE FROM lead_forms WHERE id = $1`, [id]);
}
