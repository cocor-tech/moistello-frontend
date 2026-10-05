import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { deleteCredential, getCredential } from "@/lib/passkey/store"
import { requireAuthenticatedUser } from "@/lib/passkey/auth-guard"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuthenticatedUser(req)
    if (!auth.ok) {
      return auth.response
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 })
    }

    // deleteCredential() wipes purely by credential id, so ownership has to be
    // checked here — otherwise any authenticated user can revoke another user's
    // passkey by supplying its credential id.
    const credential = await getCredential(id)
    if (!credential || credential.userId !== auth.user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    await deleteCredential(id)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("delete passkey error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
