import { NextRequest, NextResponse } from "next/server"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server"
import {
  getAndVerifyTempChallenge,
  getCredential,
  getPepper,
  getRpId,
  getExpectedOrigin,
} from "@/lib/passkey/store"
import { checkRateLimit, requireAuthenticatedUser } from "@/lib/passkey/auth-guard"
import { deriveStellarKeypair, hexEncode } from "@/lib/crypto/key-derivation"

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuthenticatedUser(req)
    if (!auth.ok) {
      return auth.response
    }

    const rateLimit = checkRateLimit(req, "auth-verify")
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } })
    }

    const body = await req.json()
    const { credentialId, assertion, tempKey } = body

    if (!assertion || typeof assertion !== "object") {
      return NextResponse.json({ error: "invalid_assertion" }, { status: 400 })
    }

    const assertionRecord = assertion as { rawId?: string; id?: string; response?: { clientDataJSON?: string } }
    const resolvedCredentialId = credentialId || assertionRecord.rawId || assertionRecord.id || ""
    if (!resolvedCredentialId) {
      return NextResponse.json({ error: "invalid_credential_id" }, { status: 400 })
    }

    const storedCredential = await getCredential(resolvedCredentialId)
    if (!storedCredential) {
      return NextResponse.json({ error: "credential_not_found" }, { status: 400 })
    }

    if (storedCredential.userId !== auth.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const clientDataJSON = assertionRecord.response?.clientDataJSON
    if (!clientDataJSON) {
      return NextResponse.json({ error: "invalid_assertion" }, { status: 400 })
    }

    let parsed: { challenge: string }
    try {
      parsed = JSON.parse(atob(clientDataJSON))
    } catch {
      return NextResponse.json({ error: "invalid_client_data" }, { status: 400 })
    }

    // Verify challenge
    if (!tempKey || !getAndVerifyTempChallenge(tempKey, parsed.challenge)) {
      return NextResponse.json({ error: "challenge_mismatch" }, { status: 400 })
    }

    const rpID = getRpId()
    const expectedOrigin = getExpectedOrigin()

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: parsed.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: resolvedCredentialId,
        publicKey: storedCredential.publicKey,
        counter: storedCredential.counter,
        transports: (storedCredential.transports ?? []) as AuthenticatorTransportFuture[],
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: "verification_failed" }, { status: 400 })
    }

    if (verification.authenticationInfo) {
      storedCredential.counter = verification.authenticationInfo.newCounter ?? storedCredential.counter
    }

    const keypair = await deriveStellarKeypair(resolvedCredentialId, getPepper())
    return NextResponse.json({
      verified: true,
      credentialId: resolvedCredentialId,
      publicKey: hexEncode(keypair.publicKey),
      secretKey: hexEncode(keypair.secretKey),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("auth-verify error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
