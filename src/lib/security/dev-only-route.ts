import { NextResponse } from "next/server"

/**
 * Defense-in-depth guard for dev-only route handlers.
 *
 * ### Primary exclusion (build-time)
 * The webpack `NormalModuleReplacementPlugin` configured in `next.config.mjs`
 * replaces the three flat-file dev routes (login, setup, upload) with
 * `src/lib/security/dev-route-stub.ts` **before compilation** when
 * `NODE_ENV === "production"`. This means the route module — including all
 * `fs` imports, PBKDF2 logic, and flat-file writes — never enters the
 * production bundle at all.
 *
 * ### Secondary guard (runtime fallback)
 * This function is the second line of defence. It is called at the top of
 * each dev route handler so that even if the build-time replacement is
 * somehow bypassed (e.g., a future misconfiguration), no flat-file operation
 * can ever execute in production.
 *
 * Returns a 404 response when running in production, or null when the caller
 * should proceed. 404 rather than 403 so the route's existence is not
 * advertised.
 */
export function blockInProduction(): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
