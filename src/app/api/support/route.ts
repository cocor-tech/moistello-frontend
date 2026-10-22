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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, message, email } = body;

    // Secure structured logging: log non-identifying metadata only (omit raw message/email PII)
    logger.info(
      {
        category,
        hasEmail: Boolean(email),
        timestamp: new Date().toISOString(),
      },
      '[Support Request] Received new support inquiry'
    );

    // Process support request logic...

    return NextResponse.json({ success: true, message: 'Support request submitted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error({ error }, '[Support Request] Failed to process support inquiry');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
