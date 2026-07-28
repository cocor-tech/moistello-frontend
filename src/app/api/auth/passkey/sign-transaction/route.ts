import { NextRequest, NextResponse } from "next/server"
import { getCredential, getPepper } from "@/lib/passkey/store"
import { checkRateLimit, requireAuthenticatedUser } from "@/lib/passkey/auth-guard"
import { deriveStellarKeypair, signWithSeed, publicKeyToStellarAddress, secureZeroMemory } from "@/lib/crypto/key-derivation"

// Read from env so production can set the correct passphrase without a code change.
// Defaults to Testnet for local development.
const DEFAULT_NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015"

// Allowed origins for CSRF protection.
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

    // Shared rate-limit bucket with sign-message so an attacker cannot
    // bypass the limit by alternating between the two endpoints.
    const rateLimit = checkRateLimit(req, "sign")
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } })
    }

    const body = await req.json()
    const { credentialId, xdr, networkPassphrase } = body

    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json({ error: "missing_credential_id" }, { status: 400 })
    }
    if (!xdr || typeof xdr !== "string") {
      return NextResponse.json({ error: "missing_xdr" }, { status: 400 })
    }

    const storedCredential = await getCredential(credentialId)
    if (!storedCredential) {
      return NextResponse.json({ error: "credential_not_found" }, { status: 400 })
    }
    if (storedCredential.userId !== auth.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const { Transaction, xdr: stellarXdr } = await import("@stellar/stellar-base")

    let envelope
    try {
      envelope = stellarXdr.TransactionEnvelope.fromXDR(xdr, "base64")
    } catch {
      return NextResponse.json({ error: "invalid_xdr" }, { status: 400 })
    }

    const passphrase = typeof networkPassphrase === "string" && networkPassphrase
      ? networkPassphrase
      : DEFAULT_NETWORK_PASSPHRASE

    let tx
    try {
      tx = new Transaction(envelope, passphrase)
    } catch {
      return NextResponse.json({ error: "invalid_transaction" }, { status: 400 })
    }

    // The Stellar secret key is derived server-side only for the duration of
    // this signing operation and is zeroed immediately after use — it is
    // never serialized into a response or persisted anywhere. Signing goes
    // through the raw seed directly (signWithSeed + addSignature) rather than
    // Keypair.fromRawEd25519Seed(), which would retain its own unzeroed copy
    // of the secret in memory for the lifetime of the Keypair object.
    const keypair = await deriveStellarKeypair(credentialId, getPepper())
    try {
      const signature = await signWithSeed(tx.hash(), keypair.secretKey)
      tx.addSignature(publicKeyToStellarAddress(keypair.publicKey), Buffer.from(signature).toString("base64"))
    } finally {
      secureZeroMemory(keypair.secretKey)
    }

    const signedXdr = tx.toEnvelope().toXDR("base64")
    return NextResponse.json({ signedXdr })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("sign-transaction error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
