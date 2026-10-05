import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { deleteCredential } from "@/lib/passkey/store"
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

    await deleteCredential(id)
    
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error("delete passkey error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
