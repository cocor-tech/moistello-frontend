import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

let inMemoryKey: Uint8Array | null = null;
let keyFetchPromise: Promise<Uint8Array | null> | null = null;

const LOCALSTORAGE_KEY = "wallet:hmac:key";
const LOCALSTORAGE_TS = "wallet:hmac:key:ts";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Thrown when an HMAC is requested before a key is available. Callers must
 * never swallow this into a silent empty signature — they should defer the
 * write until the key arrives (see withHmacKey).
 */
export class HmacKeyNotReadyError extends Error {
  constructor() {
    super("HMAC key is not loaded yet");
    this.name = "HmacKeyNotReadyError";
  }
}

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
  } catch {
    // ignore storage failures
  }
}

export function _setHmacKeyForTest(hex: string): void {
  inMemoryKey = hexToBytes(hex);
  saveKeyToStorage(hex);
}

export function clearHmacKeyCache(): void {
  inMemoryKey = null;
  keyFetchPromise = null;
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LOCALSTORAGE_KEY);
    localStorage.removeItem(LOCALSTORAGE_TS);
  } catch {
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
  } catch {
    return null;
  }
}

async function fetchKeyFromServer(): Promise<Uint8Array> {
  if (typeof window === "undefined")
    throw new Error("Cannot fetch HMAC key server-side");
  const origin = window.location?.origin && window.location.origin !== "null" ? window.location.origin : "http://localhost:3000";
  const res = await fetch(`${origin}/api/wallet/hmac/key`);
  if (!res.ok) throw new Error(`Failed to get HMAC key: ${res.status}`);
  const body = (await res.json()) as { keyHex: string };
  const bytes = hexToBytes(body.keyHex);
  inMemoryKey = bytes;
  saveKeyToStorage(body.keyHex);
  return bytes;
}

/**
 * Ensure a usable key is available, loading from memory, storage or the
 * server. Concurrent callers share a single in-flight fetch. Returns null
 * if a key could not be obtained.
 */
export async function ensureHmacKey(): Promise<Uint8Array | null> {
  const cached = getCachedKey();
  if (cached) return cached;
  if (keyFetchPromise) return keyFetchPromise;
  keyFetchPromise = (async () => {
    try {
      return await fetchKeyFromServer();
    } catch (err) {
      console.warn(
        "[hmac] Failed to load key — HMAC will fail until retry:",
        err,
      );
      return null;
    } finally {
      keyFetchPromise = null;
    }
  })();
  return keyFetchPromise;
}

/**
 * True when a key is synchronously available (memory or storage). Read and
 * verify paths use this to avoid treating "key not loaded yet" as tampering.
 */
export function isHmacKeyReady(): boolean {
  return getCachedKey() !== null;
}

/**
 * Runs `fn` with a loaded key. If the key is already available (memory or
 * storage) it runs immediately; otherwise the call is deferred until the key
 * arrives and the queued callbacks are flushed. If the key can never be
 * fetched, deferred callbacks are dropped and a warning is logged — the
 * caller's write simply does not happen instead of being signed with an
 * empty key.
 */
export function withHmacKey(fn: (key: Uint8Array) => void): void {
  const cached = getCachedKey();
  if (cached) {
    fn(cached);
    return;
  }
  queueDeferredWrite(fn);
}

const deferredWrites: Array<(key: Uint8Array) => void> = [];

function queueDeferredWrite(fn: (key: Uint8Array) => void): void {
  deferredWrites.push(fn);
  void ensureHmacKey().then((key) => {
    if (key) {
      while (deferredWrites.length > 0) {
        const next = deferredWrites.shift();
        if (next) next(key);
      }
    } else {
      // The key will never be ready — drop queued writes so nothing is
      // signed with an empty key.
      deferredWrites.length = 0;
    }
  });
}

export function computeHmacSha256Sync(data: string): string {
  if (!inMemoryKey) {
    // Never silently sign with an empty key — the very first write could
    // otherwise be computed before the key fetch resolves, silently breaking
    // tamper detection. Callers must defer via withHmacKey / ensureHmacKey.
    throw new HmacKeyNotReadyError();
  }
  return bytesToHex(
    hmac(sha256 as never, inMemoryKey, new TextEncoder().encode(data)),
  );
}

export async function computeHmacSha256(data: string): Promise<string> {
  const key = await ensureHmacKey();
  if (!key) throw new HmacKeyNotReadyError();
  return bytesToHex(hmac(sha256 as never, key, new TextEncoder().encode(data)));
}
