// src/services/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, findUserById } from "../models/userModel";
import { env } from "../config/env";

export async function loginService(email: string, password: string) {
  const user = await findUserByEmail(email);

  // We know this is returning { id, email, password } from your logs
  console.log("DATABASE_RESULT:", user);

  if (!user) {
    throw { status: 400, message: "Invalid login" };
  }

  // Use 'user.password' to match the terminal log result exactly
  const ok = await bcrypt.compare(password, user.password);

  console.log("Password Match Status:", ok);

  if (!ok) {
    throw { status: 400, message: "Invalid login" };
  }

  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: '24h' });

  return { user, token };
}

// Ensure your registerService also uses the correct column for consistency
export async function registerService(email: string, password: string, name: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw { status: 400, message: "User exists" };
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await createUser(email, hash, name);

  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: '24h' });

  return { user, token };
}

export async function getUserService(id: string) {
  return await findUserById(id);
}