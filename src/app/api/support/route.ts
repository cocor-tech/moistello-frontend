import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, message, requestId, errorType } = body

    // Validate input
    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 }
      )
    }

    // Log the support request (in production, this would send to a support system)
    console.log("[Support Request]", {
      email,
      message,
      requestId,
      errorType,
      timestamp: new Date().toISOString(),
    })

    // Return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Support API] Error:", error)
    return NextResponse.json(
      { error: "Failed to process support request" },
      { status: 500 }
    )
  }
}
