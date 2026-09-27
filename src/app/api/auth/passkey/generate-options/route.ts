import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { generateRegistrationOptions, generateAuthenticationOptions } from "@simplewebauthn/server"
import { setTempChallenge, getCredential, getRpId } from "@/lib/passkey/store"
import { requireAuthenticatedUser, checkRateLimit } from "@/lib/passkey/auth-guard"

const RP_NAME = "Moistello"

// #199: Secure random ID generation using crypto.getRandomValues as fallback
function generateSecureRandomId(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuthenticatedUser(req)
    if (!auth.ok) {
      return auth.response
    }

    const rateLimit = checkRateLimit(req, "generate-options")
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } })
    }

    const body = await req.json()
    const { mode, credentialId } = body

    if (mode === "register") {
      const rpID = getRpId()
      // #199: Use crypto.getRandomValues for secure fallback instead of Math.random
      const userID = crypto.randomUUID ? crypto.randomUUID() : generateSecureRandomId()
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userName: userID,
        userID: new TextEncoder().encode(userID),
        attestationType: "none",
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 120_000,
      })

      const tempKey = await setTempChallenge(options.challenge)

      return NextResponse.json({ options, challenge: options.challenge, tempKey })
    }

    if (mode === "authenticate") {
      if (credentialId) {
        const storedCredential = await getCredential(credentialId)
        if (!storedCredential || storedCredential.userId !== auth.user.id) {
          return NextResponse.json({ error: "credential_not_found" }, { status: 404 })
        }
      }

      const rpID = getRpId()
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentialId
          ? [{ id: credentialId, transports: ["internal"] as const }]
          : [],
        userVerification: "required",
        timeout: 60_000,
      })

      if (credentialId) {
        const tempKey = await setTempChallenge(options.challenge)
        return NextResponse.json({ options, challenge: options.challenge, tempKey })
      }

      // Discoverable credential — no credentialId, store challenge with temp key
      const tempKey = await setTempChallenge(options.challenge)
      return NextResponse.json({ options, challenge: options.challenge, tempKey })
    }

    return NextResponse.json({ error: "invalid_mode" }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("generate-options error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
