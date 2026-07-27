import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { buildCsp, generateNonce } from "@/lib/security/csp"
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookies"

// Protected routes that require authentication
const PROTECTED_PATHS = ["/circles", "/communities", "/wallet", "/settings", "/profile", "/notifications", "/contributions", "/payouts"]

/** Request header the root layout reads to nonce its inline <script> tags. */
export const NONCE_HEADER = "x-nonce"

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const { pathname } = request.nextUrl

  // A nonce is minted per request and travels two ways: forward on the request
  // so the layout can stamp it onto its inline scripts, and back on the
  // response inside the CSP header the browser enforces.
  const nonce = generateNonce()
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(NONCE_HEADER, nonce)

  // Redirect unauthenticated users to login for protected routes
  if (!token) {
    for (const path of PROTECTED_PATHS) {
      if (pathname === path || pathname.startsWith(path + "/")) {
        const url = new URL("/login", request.url)
        const redirect = NextResponse.redirect(url)
        redirect.headers.set("Content-Security-Policy", csp)
        return redirect
      }
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  // Every HTML document must carry the CSP header, so the matcher covers all
  // page routes and excludes only API handlers, framework internals and
  // static assets.
  matcher: [
    "/((?!api|_next|favicon|static|locale|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff|woff2)$).*)",
  ],
}
