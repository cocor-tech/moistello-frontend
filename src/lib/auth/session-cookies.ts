/**
 * Names and attributes for the session cookies.
 *
 * These cookies are the only place an auth token is persisted. They are set
 * exclusively by the route handlers under /api/auth/session and /api/auth/refresh
 * so they can carry `HttpOnly` — no client script ever writes them, and no
 * client script can read them back off `document.cookie`.
 *
 * The `__Host-` prefix is a browser-enforced contract: a cookie carrying it is
 * rejected unless it is `Secure`, has `Path=/` and declares no `Domain`. That
 * pins the cookie to exactly this origin, so a compromised sibling subdomain
 * cannot plant or overwrite a session. The prefix requires HTTPS, which local
 * development over plain http:// does not have, so the unprefixed names are
 * used outside production — the same split next-auth uses.
 *
 * Edge-safe: this module is imported by middleware, so it must stay free of
 * Node built-ins.
 */

const isProduction = process.env.NODE_ENV === "production"

/** Cookie holding the short-lived access token. */
export const ACCESS_TOKEN_COOKIE = isProduction
  ? "__Host-moistello_token"
  : "moistello_token"

/** Cookie holding the long-lived refresh token. Never leaves the server. */
export const REFRESH_TOKEN_COOKIE = isProduction
  ? "__Host-moistello_refresh"
  : "moistello_refresh"

/**
 * Cookie names written by earlier versions of the app, which were readable by
 * script. Cleared alongside the current ones on logout so an upgrading browser
 * does not keep a script-readable copy of a live token.
 */
export const LEGACY_TOKEN_COOKIES = [
  "moistello_token",
  "moistello_refresh",
] as const

export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Attributes shared by both session cookies. `secure` tracks NODE_ENV because
 * a `Secure` cookie is dropped outright over plain http://, which would break
 * local development.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const
