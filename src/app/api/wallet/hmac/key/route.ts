import { NextResponse } from "next/server"
import { randomBytes } from "@noble/hashes/utils.js"
import { bytesToHex } from "@noble/hashes/utils.js"

/**
 * Serves the session HMAC key to the client.
 *
 * The key MUST be set via WALLET_HMAC_KEY in production. Without it, HMACs
 * would differ on every server instance, invalidating all stored sessions.
 *
 * In development the endpoint falls back to a per-request random key so the
 * client still gets a key while being obviously non-deterministic (local
 * development only — sessions are short-lived).
 */
export async function GET() {
  const fromEnv = process.env.WALLET_HMAC_KEY

  if (fromEnv && fromEnv.length >= 32) {
    return NextResponse.json({ keyHex: fromEnv })
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Server misconfiguration: WALLET_HMAC_KEY is not set" },
      { status: 500 },
    )
  }

  // Development fallback — random key per request. Sessions will not survive
  // a page reload, but that is acceptable for local work.
  return NextResponse.json({ keyHex: bytesToHex(randomBytes(32)) })
}
