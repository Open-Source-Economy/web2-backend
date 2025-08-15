import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Get encryption key from environment or generate one for development
const getEncryptionKey = (): Buffer => {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "TOKEN_ENCRYPTION_KEY environment variable is required in production",
      );
    }
    // Development fallback - generate a key (tokens will be lost on restart)
    console.warn(
      "WARNING: Using generated encryption key. Set TOKEN_ENCRYPTION_KEY env var for persistence.",
    );
    return randomBytes(KEY_LENGTH);
  }

  // Convert base64 key to buffer
  return Buffer.from(key, "base64");
};

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag?: string;
}

/**
 * Encrypt a string value using AES-256-GCM
 */
export function encryptToken(value: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from("github-token"));

  let encrypted = cipher.update(value, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt a string value using AES-256-GCM
 */
export function decryptToken(encryptedData: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from("github-token"));

  if (encryptedData.authTag) {
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "base64"));
  }

  let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new encryption key for the TOKEN_ENCRYPTION_KEY environment variable
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}
