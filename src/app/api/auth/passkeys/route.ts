import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { listCredentials } from "@/lib/passkey/store"
import { requireAuthenticatedUser } from "@/lib/passkey/auth-guard"

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuthenticatedUser(req)
    if (!auth.ok) {
      return auth.response
    }

    const passkeys = await listCredentials(auth.user.id)
    
    return NextResponse.json({
      success: true,
      data: {
        passkeys: passkeys.map(p => ({
          credentialId: p.credentialId,
          deviceLabel: p.deviceLabel || "Unknown Device",
          createdAt: p.createdAt || new Date().toISOString(),
        }))
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("list passkeys error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
