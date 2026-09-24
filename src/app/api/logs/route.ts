import { NextRequest, NextResponse } from "next/server"
import { isLogLevelEnabled, parseLogEvents, writeServerLog } from "@/lib/logger"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 64 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 60
const requestCounts = new Map<string, number[]>()

function isRateLimited(request: NextRequest): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const now = Date.now()
  const recent = (requestCounts.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestCounts.set(key, recent)
    return true
  }
  recent.push(now)
  requestCounts.set(key, recent)
  return false
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many log requests" }, { status: 429 })
  }

  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Log payload too large" }, { status: 413 })
  }

  let payload: unknown
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Log payload too large" }, { status: 413 })
    }
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsedEvents = parseLogEvents(payload)
  if (parsedEvents.length === 0) {
    return NextResponse.json({ error: "No valid log events" }, { status: 400 })
  }

  // Apply the production level again at the trust boundary. Browser filtering
  // is useful for reducing traffic, but a stale or tampered client must not be
  // able to reintroduce debug events into production logs.
  const events = parsedEvents.filter((event) => isLogLevelEnabled(event.level))
  for (const event of events) writeServerLog(event)
  return NextResponse.json({ accepted: events.length }, { status: 202 })
}
