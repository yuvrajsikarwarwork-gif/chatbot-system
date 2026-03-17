import { query } from "../config/db";

export async function findUserByEmail(email: string) {
  // We select 'password_hash' but tell the code to call it 'password'
  const res = await query(
    "SELECT id, email, password_hash AS password FROM users WHERE email = $1",
    [email]
  );

  return res.rows[0];
}

export async function findUserById(id: string) {
  const res = await query(
    "SELECT id, email, password_hash AS password FROM users WHERE id = $1",
    [id]
  );

  return res.rows[0];
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string
) {
  // Ensure we use the new column name 'password_hash' here too
  const res = await query(
    `
    INSERT INTO users (id, email, password_hash, name)
    VALUES (gen_random_uuid(), $1, $2, $3)
    RETURNING id, email, name
    `,
    [email, passwordHash, name]
  );

  return res.rows[0];
}