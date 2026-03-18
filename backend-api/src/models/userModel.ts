import { query } from "../config/db";

export async function findUserByEmail(email: string) {
  // Now that the column exists, this SELECT will succeed
  const res = await query(
    "SELECT id, email, password_hash AS password, role FROM users WHERE email = $1",
    [email]
  );

  return res.rows[0];
}

export async function findUserById(id: string) {
  const res = await query(
    "SELECT id, email, password_hash AS password, role FROM users WHERE id = $1",
    [id]
  );

  return res.rows[0];
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string,
  role: string = 'user' 
) {
  const res = await query(
    `
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (gen_random_uuid(), $1, $2, $3, $4)
    RETURNING id, email, name, role
    `,
    [email, passwordHash, name, role]
  );

  return res.rows[0];
}