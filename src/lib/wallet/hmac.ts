import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

let inMemoryKey: Uint8Array | null = null;

const LOCALSTORAGE_KEY = "wallet:hmac:key";
const LOCALSTORAGE_TS = "wallet:hmac:key:ts";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hexToBytes(hex: string): Uint8Array {
  const raw = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    raw[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return raw;
}

function saveKeyToStorage(hex: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCALSTORAGE_KEY, hex);
    localStorage.setItem(LOCALSTORAGE_TS, String(Date.now()));
  } catch (e) {
    // ignore storage failures
  }
}

export function _setHmacKeyForTest(hex: string): void {
  inMemoryKey = hexToBytes(hex);
}

export function clearHmacKeyCache(): void {
  inMemoryKey = null;
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LOCALSTORAGE_KEY);
    localStorage.removeItem(LOCALSTORAGE_TS);
  } catch (e) {
    // ignore
  }
}

function getCachedKey(): Uint8Array | null {
  if (inMemoryKey) return inMemoryKey;
  try {
    if (typeof window === "undefined") return null;
    const hex = localStorage.getItem(LOCALSTORAGE_KEY);
    const ts = Number(localStorage.getItem(LOCALSTORAGE_TS) || "0");
    if (!hex || !ts) return null;
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      localStorage.removeItem(LOCALSTORAGE_TS);
      return null;
    }
    const bytes = hexToBytes(hex);
    inMemoryKey = bytes;
    return bytes;
  } catch (e) {
    return null;
  }
}

async function fetchKeyFromServer(): Promise<Uint8Array> {
  if (typeof window === "undefined")
    throw new Error("Cannot fetch HMAC key server-side");
  const res = await fetch("/api/wallet/hmac/key");
  if (!res.ok) throw new Error(`Failed to get HMAC key: ${res.status}`);
  const body = (await res.json()) as { keyHex: string };
  const bytes = hexToBytes(body.keyHex);
  inMemoryKey = bytes;
  saveKeyToStorage(body.keyHex);
  return bytes;
}

/**
 * Ensure a usable key is available, loading from memory, storage or the
 * server. Returns null if a key could not be obtained.
 */
export async function ensureHmacKey(): Promise<Uint8Array | null> {
  const cached = getCachedKey();
  if (cached) return cached;
  try {
    return await fetchKeyFromServer();
  } catch (err) {
    console.warn(
      "[hmac] Failed to load key — HMAC will fail until retry:",
      err,
    );
    return null;
  }
}

export function computeHmacSha256Sync(data: string): string {
  if (!inMemoryKey) return "";
  return bytesToHex(
    hmac(sha256 as never, inMemoryKey, new TextEncoder().encode(data)),
  );
}

export async function computeHmacSha256(data: string): Promise<string> {
  const key = await ensureHmacKey();
  if (!key) return "";
  return bytesToHex(hmac(sha256 as never, key, new TextEncoder().encode(data)));
}
