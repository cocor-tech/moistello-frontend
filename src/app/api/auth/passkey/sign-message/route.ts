import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { getCredential, getPepper } from "@/lib/passkey/store"
import { checkRateLimit, requireAuthenticatedUser } from "@/lib/passkey/auth-guard"
import { deriveStellarKeypair, hexEncode, signWithSeed, secureZeroMemory } from "@/lib/crypto/key-derivation"

// Allowed origins for CSRF protection (shared with sign-transaction).
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || []

function checkCsrf(req: NextRequest): Response | null {
  if (process.env.NODE_ENV === "development") return null
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  const source = origin || (referer ? new URL(referer).origin : null)
  if (!source) {
    return NextResponse.json({ error: "missing_origin" }, { status: 403 })
  }
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(source)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 })
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const csrfErr = checkCsrf(req)
    if (csrfErr) return csrfErr

    const auth = requireAuthenticatedUser(req)
    if (!auth.ok) {
      return auth.response
    }

    // Shared rate-limit bucket with sign-transaction.
    const rateLimit = checkRateLimit(req, "sign")
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } })
    }

    const body = await req.json()
    const { credentialId, message } = body

    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json({ error: "missing_credential_id" }, { status: 400 })
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "missing_message" }, { status: 400 })
    }

    const storedCredential = await getCredential(credentialId)
    if (!storedCredential) {
      return NextResponse.json({ error: "credential_not_found" }, { status: 400 })
    }
    if (storedCredential.userId !== auth.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    // The Stellar secret key is derived server-side only for the duration of
    // this signing operation and is zeroed immediately after use — it is
    // never serialized into a response or persisted anywhere.
    const keypair = await deriveStellarKeypair(credentialId, getPepper())
    const publicKeyHex = hexEncode(keypair.publicKey)

    let signature: Uint8Array
    try {
      const { sha256 } = await import("@noble/hashes/sha2.js")
      const hashBytes = sha256(new TextEncoder().encode(message))
      signature = await signWithSeed(hashBytes, keypair.secretKey)
    } finally {
      secureZeroMemory(keypair.secretKey)
    }

    return NextResponse.json({
      signature: hexEncode(signature),
      publicKey: publicKeyHex,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("sign-message error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
