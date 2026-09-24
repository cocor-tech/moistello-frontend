import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import {
  getAndVerifyTempChallenge,
  storeCredential,
  getPepper,
  getRpId,
  getExpectedOrigin,
} from "@/lib/passkey/store"
import { checkRateLimit, requireAuthenticatedUser } from "@/lib/passkey/auth-guard"
import { deriveStellarKeypair, hexEncode, secureZeroMemory } from "@/lib/crypto/key-derivation"

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuthenticatedUser(req)
    if (!auth.ok) {
      return auth.response
    }

    const rateLimit = checkRateLimit(req, "register")
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } })
    }

    const body = await req.json()
    const { attestation, tempKey } = body

    if (!attestation || typeof attestation !== "object") {
      return NextResponse.json({ error: "invalid_attestation" }, { status: 400 })
    }

    const attestationRecord = attestation as { id?: string; rawId?: string; response?: { clientDataJSON?: string } }
    const credentialId = attestationRecord.rawId || attestationRecord.id || ""

    if (!credentialId) {
      return NextResponse.json({ error: "missing_credential_id" }, { status: 400 })
    }

    const clientDataJSON = attestationRecord.response?.clientDataJSON
    if (!clientDataJSON) {
      return NextResponse.json({ error: "invalid_attestation" }, { status: 400 })
    }

    let parsed: { challenge: string }
    try {
      parsed = JSON.parse(atob(clientDataJSON))
    } catch {
      return NextResponse.json({ error: "invalid_client_data" }, { status: 400 })
    }

    if (!tempKey || !(await getAndVerifyTempChallenge(tempKey, parsed.challenge))) {
      return NextResponse.json({ error: "challenge_mismatch" }, { status: 400 })
    }

    const rpID = getRpId()
    const expectedOrigin = getExpectedOrigin()

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: parsed.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "verification_failed" }, { status: 400 })
    }

    const { credential } = verification.registrationInfo
    await storeCredential(credential.id, {
      userId: auth.user.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports as string[] | undefined,
    })

    // The Stellar secret key is derived here only to compute the public key.
    // It must never be sent to the client — signing happens exclusively via
    // the /sign-transaction and /sign-message routes, which re-derive it
    // server-side on demand.
    const keypair = await deriveStellarKeypair(credential.id, getPepper())
    const publicKey = hexEncode(keypair.publicKey)
    secureZeroMemory(keypair.secretKey)

    return NextResponse.json({
      verified: true,
      credentialId: credential.id,
      publicKey,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("register error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
