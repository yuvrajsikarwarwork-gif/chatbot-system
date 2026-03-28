import crypto from "crypto";

import { env } from "../config/env";

export interface EncryptedValue {
  iv: string;
  tag: string;
  value: string;
  version: 1 | 2;
  keyVersion?: string;
}

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

function getActiveEncryptionSecret() {
  return env.INTEGRATION_SECRET_KEY || env.JWT_SECRET;
}

function getKeyVersion() {
  return String(env.INTEGRATION_SECRET_KEY_VERSION || "v1").trim() || "v1";
}

function getDecryptionCandidates(keyVersion?: string | null) {
  const candidates = new Map<string, Buffer>();
  const activeSecret = getActiveEncryptionSecret();
  if (activeSecret) {
    candidates.set(getKeyVersion(), deriveKey(activeSecret));
  }

  const previousSecrets = String(env.INTEGRATION_SECRET_KEY_PREVIOUS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  previousSecrets.forEach((secret, index) => {
    const label = `legacy_${index + 1}`;
    if (!candidates.has(label)) {
      candidates.set(label, deriveKey(secret));
    }
  });

  if (keyVersion && candidates.has(keyVersion)) {
    const preferred = candidates.get(keyVersion)!;
    return [preferred, ...Array.from(candidates.values()).filter((candidate) => candidate !== preferred)];
  }

  return Array.from(candidates.values());
}

export function encryptSecret(value: string): EncryptedValue {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    deriveKey(getActiveEncryptionSecret()),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    value: encrypted.toString("base64"),
    version: 2,
    keyVersion: getKeyVersion(),
  };
}

export function isEncryptedValue(value: unknown): value is EncryptedValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.iv === "string" &&
    typeof candidate.tag === "string" &&
    typeof candidate.value === "string" &&
    (candidate.version === undefined ||
      candidate.version === 1 ||
      candidate.version === 2)
  );
}

export function decryptSecret(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (isEncryptedValue(parsed)) {
          return decryptSecret(parsed);
        }
      } catch {
        // Fall through to the plain string return below.
      }
    }
  }

  if (!isEncryptedValue(value)) {
    return typeof value === "string" ? value : null;
  }

  const candidates = getDecryptionCandidates(value.keyVersion);
  for (const key of candidates) {
    try {
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_ALGORITHM,
        key,
        Buffer.from(value.iv, "base64")
      );

      decipher.setAuthTag(Buffer.from(value.tag, "base64"));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(value.value, "base64")),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch {
      continue;
    }
  }

  return null;
}
