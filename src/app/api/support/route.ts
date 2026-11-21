import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, message, requestId, errorType, category } = body

    // Validate input
    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 }
      )
    }

    // Secure structured logging: log non-identifying metadata only (omit raw message/email PII)
    logger.info(
      {
        category,
        errorType,
        requestId,
        hasEmail: Boolean(email),
        timestamp: new Date().toISOString(),
      },
      "[Support Request] Received new support inquiry"
    )

    // Return success
    return NextResponse.json({ success: true, message: "Support request submitted successfully." })
  } catch (error) {
    logger.error({ error }, "[Support API] Error: Failed to process support request")
    return NextResponse.json(
      { error: "Failed to process support request" },
      { status: 500 }
    )
  }
}
