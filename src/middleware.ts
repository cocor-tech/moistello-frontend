import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { buildCsp, generateNonce } from "@/lib/security/csp"
import { API_CSP } from "@/lib/security/api-csp.mjs"
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_MAX_AGE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-cookies"
import { LOCALE_COOKIE, resolveLocale } from "@/lib/locale/locale-cookie"

// Protected routes that require authentication
const PROTECTED_PATHS = ["/circles", "/communities", "/wallet", "/settings", "/profile", "/notifications", "/contributions", "/payouts"]

// Dev-only API routes backed by flat-file JSON storage.  These are useful
// for local development but must never be reachable in a deployed environment.
// The middleware blocks them as the first line of defence; each handler also
// calls blockInProduction() as defence-in-depth.
const DEV_ONLY_API_PATHS = [
  "/api/auth/login",
  "/api/auth/setup",
  "/api/upload",
  "/api/auth/logout",
  "/api/auth",
]

/** Request header the root layout reads to nonce its inline <script> tags. */
export const NONCE_HEADER = "x-nonce"
export const CSRF_HEADER = "x-csrf-token"

function generateCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
}

function attachCsrfCookie(response: NextResponse, csrfToken: string) {
  response.cookies.set(CSRF_TOKEN_COOKIE, csrfToken, {
    ...SESSION_COOKIE_OPTIONS,
    httpOnly: false,
    maxAge: CSRF_TOKEN_MAX_AGE,
  })
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set([request.nextUrl.origin])
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://moistello.com" : undefined)
  if (configuredAppUrl) {
    try {
      origins.add(new URL(configuredAppUrl).origin)
    } catch {
      origins.add(configuredAppUrl)
    }
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000")
    origins.add("http://localhost:1110")
    origins.add("http://127.0.0.1:3000")
    origins.add("http://127.0.0.1:1110")
  }
  return origins
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block dev-only API routes in production at the middleware level.
  // Returns 404 so the routes' existence is never advertised.
  if (process.env.NODE_ENV === "production") {
    for (const path of DEV_ONLY_API_PATHS) {
      if (pathname === path || pathname.startsWith(path + "/")) {
        // /api/auth is the dev-only session-check handler.  Production
        // sub-routes (/api/auth/session, /api/auth/refresh, …) must not be
        // blocked, so require an exact match for the bare /api/auth path.
        if (path === "/api/auth" && pathname !== path) continue
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
    }
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  // API routes return JSON, never HTML, so they must not receive the page CSP
  // with its per-request script nonce and third-party script sources. They get
  // the static, minimal API policy instead (same one next.config.mjs serves via
  // headers()). The nonce is still minted — it travels on the request for
  // pages that render inline scripts — but the API response advertises no
  // script allowances at all.
  const nonce = generateNonce()
  const isApiRoute = pathname.startsWith("/api/")
  const csp = isApiRoute ? API_CSP : buildCsp(nonce)
  const csrfToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value || generateCsrfToken()
  const shouldSetCsrfCookie = !request.cookies.has(CSRF_TOKEN_COOKIE)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(NONCE_HEADER, nonce)
  requestHeaders.set(CSRF_HEADER, csrfToken)
  
  // #211: Add locale header for dynamic lang attribute. The cookie is the only
  // locale state the server can see, and it is written the moment the visitor
  // picks a language — so this survives the login redirect instead of falling
  // back to English on every document request.
  //
  // resolveLocale() rather than the raw value: the cookie is attacker-settable
  // and this header ends up in the <html lang> attribute, so an unvalidated
  // value must never be forwarded as-is.
  const locale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value)
  requestHeaders.set("x-locale", locale)

  // Log ingestion is a same-origin, non-state-changing telemetry endpoint. It
  // intentionally bypasses the session CSRF handshake because sendBeacon cannot
  // attach custom headers; the route validates and redacts its payload instead.
  const isTelemetryRoute = pathname === "/api/logs"
  if (isTelemetryRoute) {
    const origin = request.headers.get("origin")
    if (origin && !getAllowedOrigins(request).has(origin)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
    }
  }

  // #207: CSRF protection for mutating API routes
  if (isApiRoute && !isTelemetryRoute && ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin")
    if (!origin || !getAllowedOrigins(request).has(origin)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
    }

    const clientCsrf = request.headers.get("x-csrf-token")
    if (clientCsrf !== csrfToken) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
  }

  // Redirect unauthenticated users to login for protected routes
  if (!token) {
    for (const path of PROTECTED_PATHS) {
      if (pathname === path || pathname.startsWith(path + "/")) {
        const url = new URL("/login", request.url)
        const redirect = NextResponse.redirect(url)
        redirect.headers.set("Content-Security-Policy", csp)
        if (shouldSetCsrfCookie) attachCsrfCookie(redirect, csrfToken)
        return redirect
      }
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  if (shouldSetCsrfCookie) attachCsrfCookie(response, csrfToken)
  return response
}

export const config = {
  // Every HTML document must carry the CSP header, so the matcher covers all
  // page routes and excludes only framework internals and static assets.
  // The dev-only API paths are listed explicitly so the middleware can block
  // them in production before any route handler executes.
  matcher: [
    "/((?!_next|favicon|static|locale|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff|woff2)$).*)",
    "/api/auth/login",
    "/api/auth/setup",
    "/api/upload",
    "/api/auth/logout",
    "/api/auth",
  ],
}
