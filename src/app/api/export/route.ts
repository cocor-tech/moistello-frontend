import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { API_BASE_URL } from "@/lib/constants"
import { requireAuthenticatedUser, checkRateLimit } from "@/lib/passkey/auth-guard"
import {
  buildPersonalDataArchive,
  toArchiveFilename,
  type ExportNotification,
  type ExportProfile,
} from "@/lib/export/personal-data"
import type { Contribution } from "@/types"

export const runtime = "nodejs"

/** Generous enough to be usable, tight enough to stop bulk scraping. */
const EXPORT_RATE_LIMIT = 3
const EXPORT_RATE_WINDOW_MS = 60_000

/**
 * Fetches the user's own records from the backend.
 *
 * The session cookie is forwarded so the backend can scope the query itself;
 * the response is filtered by `userId` again on the way out, so a backend that
 * ignores the scoping still cannot leak another user's rows.
 */
async function fetchUserRecords<T>(path: string, cookie: string): Promise<T[]> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    })
    if (!response.ok) return []
    const body: unknown = await response.json()
    const data = (body as { data?: unknown })?.data ?? body
    return Array.isArray(data) ? (data as T[]) : []
  } catch (error) {
    // A partial export is better than a failed one, but the caller has to know:
    // the counts in the archive come from what actually came back.
    logger.error("[export] Failed to fetch", path, error)
    return []
  }
}

/**
 * `GET /api/export` — download everything we hold about the caller (#472).
 *
 * Identity comes from the session cookie, never from a query parameter or the
 * request body, so the export cannot be aimed at another user by editing a URL.
 */
export async function GET(request: NextRequest) {
  const auth = requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  const limit = checkRateLimit(request, "personal-data-export", EXPORT_RATE_LIMIT, EXPORT_RATE_WINDOW_MS)
  if (!limit.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(limit.retryAfterMs / 1000))
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Too many export requests. Try again in ${retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(EXPORT_RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  const user = auth.user
  const sessionValue = request.cookies.get("moistello_session")?.value ?? ""
  // A `Cookie` request header is `name=value` pairs, so the raw value is not
  // enough — forwarding the bare token would leave the backend unable to match
  // a session and it would see the request as anonymous.
  const cookie = `moistello_session=${sessionValue}`
  const generatedAt = new Date()

  const [contributions, notifications] = await Promise.all([
    fetchUserRecords<Contribution>("/contributions", cookie),
    fetchUserRecords<ExportNotification>("/notifications?limit=1000", cookie),
  ])

  const profile: ExportProfile = {
    id: user.id,
    username: user.username ?? null,
  }

  const archive = buildPersonalDataArchive({ user: profile, contributions, notifications, generatedAt })

  logger.info("[export] Archive generated", { userId: user.id, ...archive.counts })

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${toArchiveFilename(user.id, generatedAt)}"`,
      "Cache-Control": "no-store",
      "X-RateLimit-Limit": String(EXPORT_RATE_LIMIT),
      "X-RateLimit-Remaining": String(Math.max(0, EXPORT_RATE_LIMIT - 1)),
    },
  })
}
