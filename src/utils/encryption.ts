// /src/utils/encryption.ts
import crypto from "crypto";
import { logger } from "./logger";
import { CONFIG } from "../config";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

export function encryptPrivateKey(plainKey: string): string {
  try {
    if (CONFIG.dbEncryptionKey.length !== KEY_LENGTH) {
      throw new Error(
        "DB_ENCRYPTION_KEY must be exactly 32 bytes for AES-256-GCM.",
      );
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, CONFIG.dbEncryptionKey, iv);

    const encryptedBuffer = Buffer.concat([
      cipher.update(plainKey, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString("hex"),
      authTag.toString("hex"),
      encryptedBuffer.toString("hex"),
    ].join(":");
  } catch (error) {
    logger.error(`encryptPrivateKey failed: ${(error as Error).message}`);
    throw error;
  }
}

export function decryptPrivateKey(cipherText: string): string {
  try {
    if (CONFIG.dbEncryptionKey.length !== KEY_LENGTH) {
      throw new Error(
        "DB_ENCRYPTION_KEY must be exactly 32 bytes for AES-256-GCM.",
      );
    }

    const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedData = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      CONFIG.dbEncryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decryptedBuffer.toString("utf8");
  } catch (error) {
    logger.error(`decryptPrivateKey failed: ${(error as Error).message}`);
    throw error;
  }
}
