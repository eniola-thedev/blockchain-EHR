// services/encryptionService.js — AES-256-GCM encryption for medical records
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt data using AES-256-GCM
 */
const encryptData = (data) => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "0".repeat(64), "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(
      typeof data === "string" ? data : JSON.stringify(data),
      "utf8",
    ),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

/**
 * Decrypt AES-256-GCM encrypted data
 */
const decryptData = ({ encrypted, iv, authTag }) => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "0".repeat(64), "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

/**
 * Hash data with SHA-256 (for blockchain verification)
 */
const hashData = (data) =>
  crypto
    .createHash("sha256")
    .update(typeof data === "string" ? data : JSON.stringify(data))
    .digest("hex");

/**
 * Generate a new 256-bit encryption key
 */
const generateKey = () => crypto.randomBytes(KEY_LENGTH).toString("hex");

module.exports = { encryptData, decryptData, hashData, generateKey };
