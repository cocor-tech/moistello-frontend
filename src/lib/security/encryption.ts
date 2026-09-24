import { logger } from "@/lib/logger"
/**
 * AES-GCM encryption utilities for localStorage protection.
 *
 * Sensitive data persisted to localStorage (wallet sessions, user profiles) is
 * encrypted with a key derived from the user's auth session. This mitigates
 * exfiltration via XSS or physical device access. The key rotates on re-auth.
 *
 * Design:
 * - Key derivation: PBKDF2 with session-unique salt
 * - Encryption: AES-GCM (256-bit)
 * - IV: Random 12 bytes per encryption operation
 * - Auth tag: 128 bits (GCM default)
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

interface EncryptedPayload {
  /** Base64-encoded ciphertext + auth tag */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded salt used for key derivation */
  salt: string;
  /** Version marker for format evolution */
  version: 1;
}

/**
 * Derive an AES key from a passphrase using PBKDF2.
 *
 * The passphrase is typically a session token or user identifier. The salt is
 * randomly generated per encryption and stored alongside the ciphertext so the
 * key can be re-derived during decryption.
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt plaintext with AES-GCM.
 *
 * @param plaintext - The data to encrypt (will be UTF-8 encoded)
 * @param passphrase - Key derivation input (e.g., session token)
 * @returns Encrypted payload with IV and salt
 */
export async function encrypt(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    version: 1,
  };
}

/**
 * Decrypt an AES-GCM encrypted payload.
 *
 * @param payload - The encrypted payload with IV and salt
 * @param passphrase - Key derivation input (must match encryption passphrase)
 * @returns Decrypted plaintext
 * @throws If decryption fails (wrong passphrase, tampered ciphertext, etc.)
 */
export async function decrypt(
  payload: EncryptedPayload,
  passphrase: string,
): Promise<string> {
  if (payload.version !== 1) {
    throw new Error(`Unsupported encryption version: ${payload.version}`);
  }

  const ciphertext = Uint8Array.from(atob(payload.ciphertext), (c) =>
    c.charCodeAt(0),
  );
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(payload.salt), (c) => c.charCodeAt(0));

  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt and store data in localStorage.
 *
 * @param key - localStorage key
 * @param data - Data to encrypt (will be JSON-serialized)
 * @param passphrase - Encryption key derivation input
 */
export async function encryptToStorage<T>(
  key: string,
  data: T,
  passphrase: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const plaintext = JSON.stringify(data);
    const payload = await encrypt(plaintext, passphrase);
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    logger.warn(`[encryption] Failed to encrypt and store ${key}:`, e);
    throw e;
  }
}

/**
 * Decrypt and retrieve data from localStorage.
 *
 * @param key - localStorage key
 * @param passphrase - Decryption key derivation input (must match encryption)
 * @returns Decrypted data or null if not found or decryption fails
 */
export async function decryptFromStorage<T>(
  key: string,
  passphrase: string,
): Promise<T | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const payload: EncryptedPayload = JSON.parse(raw);
    const plaintext = await decrypt(payload, passphrase);
    return JSON.parse(plaintext) as T;
  } catch (e) {
    logger.warn(`[encryption] Failed to decrypt ${key}:`, e);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Check if a localStorage value is encrypted.
 *
 * @param key - localStorage key
 * @returns true if the value appears to be an EncryptedPayload
 */
export function isEncrypted(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "ciphertext" in parsed &&
      "iv" in parsed &&
      "salt" in parsed &&
      "version" in parsed
    );
  } catch {
    return false;
  }
}
