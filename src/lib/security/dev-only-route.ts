import { NextResponse } from "next/server"

/**
 * Guard for route handlers that are local-development scaffolding.
 *
 * The file-backed auth handlers under /api/auth read and write
 * content/users.json and content/sessions.json directly. There is no
 * database behind them, no locking around the read-modify-write cycles, and
 * no rate limiting in front of them — concurrent requests silently clobber
 * each other and credential stuffing is unbounded. They are useful for
 * running the app locally and must never answer a request in a deployed
 * environment.
 *
 * Returns a 404 response when running in production, or null when the caller
 * should proceed. 404 rather than 403 so the route's existence is not
 * advertised.
 */
export function blockInProduction(): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
