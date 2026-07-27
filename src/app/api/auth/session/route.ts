import { NextRequest, NextResponse } from "next/server"
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  LEGACY_TOKEN_COOKIES,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-cookies"

/**
 * Session cookie endpoint.
 *
 * The client obtains tokens from the API and hands them here; this handler is
 * the only thing that writes them down, and it writes them as `HttpOnly`
 * cookies. That keeps the refresh token entirely out of reach of page script.
 *
 * GET returns the access token so a freshly loaded tab can put it back in
 * memory and sign its `Authorization` headers. The API is a separate origin
 * and takes bearer tokens, so the token has to reach JavaScript somehow; what
 * this buys is that it is never *persisted* anywhere script can read, and the
 * refresh token — the credential that mints new sessions — never reaches the
 * client at all.
 */

export const runtime = "nodejs"

/** Milliseconds remaining on a JWT, or null if it carries no readable `exp`. */
function readExpiry(token: string): number | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    )
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** Rehydrate a page load: hand back the access token held in the cookie. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const expiresAt = readExpiry(token)
  if (expiresAt !== null && expiresAt <= Date.now()) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true, token, expiresAt })
}

/** Store a freshly issued token pair. */
export async function POST(request: NextRequest) {
  let body: { token?: unknown; refreshToken?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { token, refreshToken } = body

  if (typeof token !== "string" || token.length === 0) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  const expiresAt = readExpiry(token)
  const response = NextResponse.json({ success: true, expiresAt })

  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  })

  if (typeof refreshToken === "string" && refreshToken.length > 0) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    })
  }

  return response
}

/** Log out: drop both cookies, plus any script-readable ones left by older builds. */
export async function DELETE() {
  const response = NextResponse.json({ success: true })

  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    response.cookies.set(name, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 })
  }

  for (const name of LEGACY_TOKEN_COOKIES) {
    response.cookies.set(name, "", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  }

  return response
}
