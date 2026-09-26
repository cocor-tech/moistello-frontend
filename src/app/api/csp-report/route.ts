import { NextRequest, NextResponse } from "next/server"
import { parseCspReport, writeCspReport } from "@/lib/security/csp-report"

export const runtime = "nodejs"

/**
 * CSP violation report collector.
 *
 * ## Why this endpoint exists
 *
 * `CSP_REPORT_ONLY=true` makes the middleware serve the page policy under
 * `Content-Security-Policy-Report-Only`, so the browser POSTs a report here
 * every time the *candidate* policy would have blocked something. Without a
 * collector those violations are discarded, and "we validated the new policy
 * first" is just a claim with no evidence behind it.
 *
 * ## This is a stub, deliberately
 *
 * The acceptance bar for this change is that a violation is observable in
 * staging. `writeCspReport` emits a structured `warn` line per report, which
 * already lands in whatever the deployment's log drain (and Sentry) already
 * consumes — no new infrastructure, no new retention policy, no new PII story.
 * Swapping in a durable store later is a change to that one function; the
 * validation, rate limiting and middleware carve-out around it are already
 * correct and should not be rewritten.
 *
 * ## Trust boundary
 *
 * Every field in a violation report is attacker-influenced: `blocked-uri` and
 * `source-file` are strings the violating page chose, and the whole body is a
 * POST anyone can send by hand. So the payload is parsed and length-capped
 * before anything is logged, values are truncated rather than trusted, and the
 * rate limiter keeps a single client from turning this into a log-volume
 * amplifier. Handlers mirror /api/logs for exactly these reasons.
 */

const MAX_BODY_BYTES = 32 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REPORTS_PER_WINDOW = 120
const MAX_RATE_LIMIT_KEYS = 10_000
const RATE_LIMIT_PRUNE_INTERVAL_MS = 10_000

const reportCounts = new Map<string, number[]>()
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
  for (const [key, timestamps] of reportCounts) {
    const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
    if (recent.length === 0) reportCounts.delete(key)
    else reportCounts.set(key, recent)
  }
}

function isRateLimited(request: NextRequest): boolean {
  const key = getClientKey(request)
  const now = Date.now()
  pruneRateLimits(now)

  // Attacker-controlled forwarded addresses must not grow the heap forever.
  // Expired keys go via the periodic prune; when the hard cap is hit, evict
  // the key whose oldest live request is oldest.
  if (!reportCounts.has(key) && reportCounts.size >= MAX_RATE_LIMIT_KEYS) {
    let oldestKey: string | undefined
    let oldestTimestamp = Number.POSITIVE_INFINITY
    for (const [candidateKey, timestamps] of reportCounts) {
      const candidateTimestamp = timestamps[0] ?? Number.POSITIVE_INFINITY
      if (candidateTimestamp < oldestTimestamp) {
        oldestKey = candidateKey
        oldestTimestamp = candidateTimestamp
      }
    }
    if (oldestKey) reportCounts.delete(oldestKey)
  }

  const recent = (reportCounts.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= MAX_REPORTS_PER_WINDOW) {
    reportCounts.set(key, recent)
    return true
  }
  recent.push(now)
  reportCounts.set(key, recent)
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
          // Already over the limit; cancellation is best effort.
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
      { error: "Too many CSP reports" },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1000) } },
    )
  }

  // Pre-flight the declared length so an oversized upload is refused before it
  // is read; the streaming counter below catches the chunked/no-length case.
  const contentLengthHeader = request.headers.get("content-length")
  if (contentLengthHeader) {
    const normalized = contentLengthHeader.trim()
    if (!/^\d+$/.test(normalized)) {
      return NextResponse.json({ error: "Invalid content length" }, { status: 400 })
    }
    const contentLength = Number(normalized)
    if (!Number.isSafeInteger(contentLength)) {
      return NextResponse.json({ error: "Invalid content length" }, { status: 400 })
    }
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "CSP report too large" }, { status: 413 })
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(await readBody(request))
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "CSP report too large" }, { status: 413 })
    }
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const reports = parseCspReport(payload)
  if (reports.length === 0) {
    return NextResponse.json({ error: "No valid CSP reports" }, { status: 400 })
  }

  for (const report of reports) writeCspReport(report)

  return NextResponse.json({ accepted: reports.length }, { status: 202 })
}
