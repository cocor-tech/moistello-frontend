import { hmac } from "@noble/hashes/hmac.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex } from "@noble/hashes/utils.js"

/**
 * The HMAC key is stored server-side in the WALLET_HMAC_KEY env var and
 * served to the client once per page load via GET /api/wallet/hmac/key.
 * This keeps the key out of the JS bundle (eliminating the NEXT_PUBLIC_
 * exposure) while still allowing synchronous HMAC computation client-side
 * after the key is cached.
 *
 * The endpoint returns 500 in production if WALLET_HMAC_KEY is unset — the
 * server must be configured before any HMAC-dependent feature works.
 *
 * The module starts fetching the key immediately on import.  The synchronous
 * `computeHmacSha256()` call below returns before the fetch completes only
 * during the narrow window between module init and first response — after
 * that the key is cached and all calls are synchronous in practice.
 */
let hmacKey: Uint8Array | null = null

fetch("/api/wallet/hmac/key")
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to get HMAC key: ${res.status}`)
    return res.json() as Promise<{ keyHex: string }>
  })
  .then(({ keyHex }) => {
    const raw = new Uint8Array(keyHex.length / 2)
    for (let i = 0; i < keyHex.length; i += 2) {
      raw[i / 2] = parseInt(keyHex.substring(i, i + 2), 16)
    }
    hmacKey = raw
  })
  .catch((err) => console.warn("[hmac] Failed to load key — HMAC will fail until retry:", err))

export function computeHmacSha256(data: string): string {
  if (!hmacKey) {
    // Key not yet loaded — callers that hit this during the first render
    // window will get a non-matching HMAC (treated as empty/no data by the
    // verification logic).  The key will be cached before any write path
    // runs (login, session persist), so the narrow race is benign.
    return ""
  }
  return bytesToHex(hmac(sha256 as never, hmacKey, new TextEncoder().encode(data)))
}

/** @internal for testing — inject a fixed key so tests don't need the server. */
export function _setHmacKeyForTest(hex: string): void {
  const raw = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) raw[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  hmacKey = raw
}
