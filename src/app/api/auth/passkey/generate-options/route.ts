import { NextRequest, NextResponse } from "next/server"
import { generateRegistrationOptions, generateAuthenticationOptions } from "@simplewebauthn/server"
import { setTempChallenge, getRpId } from "@/lib/passkey/store"

const RP_NAME = "Moistello"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, credentialId } = body

    if (mode === "register") {
      const rpID = getRpId()
      const userID = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
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

      const tempKey = setTempChallenge(options.challenge)

      return NextResponse.json({ options, challenge: options.challenge, tempKey })
    }

    if (mode === "authenticate") {
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
        const tempKey = setTempChallenge(options.challenge)
        return NextResponse.json({ options, challenge: options.challenge, tempKey })
      }

      // Discoverable credential — no credentialId, store challenge with temp key
      const tempKey = setTempChallenge(options.challenge)
      return NextResponse.json({ options, challenge: options.challenge, tempKey })
    }

    return NextResponse.json({ error: "invalid_mode" }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("generate-options error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
