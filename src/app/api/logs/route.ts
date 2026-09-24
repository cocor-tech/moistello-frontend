import { NextRequest, NextResponse } from "next/server"
import { isLogLevelEnabled, parseLogEvents, writeServerLog } from "@/lib/logger"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 64 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 60
const MAX_RATE_LIMIT_KEYS = 10_000
const RATE_LIMIT_PRUNE_INTERVAL_MS = 10_000
const requestCounts = new Map<string, number[]>()
let lastRateLimitPrune = 0

class BodyTooLargeError extends Error {}

function getClientKey(request: NextRequest): string {
  const requestIp = (request as NextRequest & { ip?: string }).ip
  return requestIp?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown"
}

function pruneRateLimits(now: number): void {
  if (now - lastRateLimitPrune < RATE_LIMIT_PRUNE_INTERVAL_MS) return
  lastRateLimitPrune = now
  for (const [key, timestamps] of requestCounts) {
    const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
    if (recent.length === 0) requestCounts.delete(key)
    else requestCounts.set(key, recent)
  }
}

function isRateLimited(request: NextRequest): boolean {
  const key = getClientKey(request)
  const now = Date.now()
  pruneRateLimits(now)

  // Keep attacker-controlled forwarded addresses from growing the process heap
  // indefinitely. Expired keys are removed by the periodic prune above; the
  // oldest live key is evicted when the hard cap is reached.
  if (!requestCounts.has(key) && requestCounts.size >= MAX_RATE_LIMIT_KEYS) {
    const oldestKey = requestCounts.keys().next().value
    if (oldestKey) requestCounts.delete(oldestKey)
  }

  const recent = (requestCounts.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestCounts.set(key, recent)
    return true
  }
  recent.push(now)
  requestCounts.set(key, recent)
  return false
}

async function readBody(request: NextRequest): Promise<string> {
  if (!request.body) return ""
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let body = ""
  let bytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BODY_BYTES) {
        try {
          await reader.cancel()
        } catch {
          // The request is already over the limit; cancellation is best effort.
        }
        throw new BodyTooLargeError()
      }
      body += decoder.decode(value, { stream: true })
    }
    return body + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many log requests" },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1000) } },
    )
  }

  const contentLengthHeader = request.headers.get("content-length")
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader)
    if (!Number.isFinite(contentLength) || !Number.isInteger(contentLength) || contentLength < 0) {
      return NextResponse.json({ error: "Invalid content length" }, { status: 400 })
    }
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Log payload too large" }, { status: 413 })
    }
  }

  let payload: unknown
  try {
    const rawBody = await readBody(request)
    payload = JSON.parse(rawBody)
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Log payload too large" }, { status: 413 })
    }
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
