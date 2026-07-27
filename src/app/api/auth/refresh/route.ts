import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/constants"
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-cookies"

/**
 * Exchanges the refresh token for a new access token.
 *
 * The refresh token is read from its `HttpOnly` cookie here on the server and
 * forwarded to the API from here, so it is never handed to page script. The
 * client calls this route with no body at all; possession of the cookie is the
 * whole credential.
 */

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

  if (!refreshToken) {
    return NextResponse.json(
      { error: "No refresh token available" },
      { status: 401 }
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the authentication service" },
      { status: 502 }
    )
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 })
  }

  const payload = await upstream.json().catch(() => null)
  const token: unknown = payload?.data?.token ?? payload?.token

  if (typeof token !== "string" || token.length === 0) {
    return NextResponse.json(
      { error: "No token in refresh response" },
      { status: 502 }
    )
  }

  const response = NextResponse.json({ token })

  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  })

  // Some backends rotate the refresh token on every exchange; persist the new
  // one when it comes back so the old value stops being valid.
  const rotated: unknown = payload?.data?.refreshToken ?? payload?.refreshToken
  if (typeof rotated === "string" && rotated.length > 0) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, rotated, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    })
  }

  return response
}
