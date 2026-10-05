/**
 * Site-wide SEO constants.
 *
 * This module deliberately has **zero runtime imports**. `scripts/audit-seo-routes.mjs`
 * loads the route registry in a bare Node process so it can audit the routes
 * without booting Next.js, a bundler or a test runner. Anything this module
 * reaches for at runtime has to be available there too, so the constants are
 * derived from `process.env` inline rather than pulled from a helper.
 */

const DEFAULT_SITE_URL = "https://moistello.com"

/**
 * Absolute origin that relative canonicals and `og:url` resolve against.
 *
 * `NEXT_PUBLIC_APP_URL` wins when it parses as an absolute URL, so a preview
 * deployment advertises its own origin in link previews instead of leaking the
 * production one. Anything unparseable falls back to the production origin —
 * a malformed env var must never turn into a broken canonical.
 */
export const SITE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (!configured) return DEFAULT_SITE_URL
  try {
    return new URL(configured).origin
  } catch {
    return DEFAULT_SITE_URL
  }
})()

export const SITE_NAME = "Moistello"

export const TWITTER_SITE = "@moistello"
export const TWITTER_CREATOR = "@nekwasar"

export const AUTHOR_NAME = "Nekwachukwu Ucheokoye"

/**
 * Default social card. Served from `public/logo.jpg` (1200x630), which is the
 * aspect ratio every major scraper expects for a large link preview.
 *
 * Deliberately not `as const`: `Metadata["openGraph"]["images"]` expects a
 * mutable object, and a readonly literal would fail to type-check there.
 */
export const OG_IMAGE = {
  url: "/logo.jpg",
  width: 1200,
  height: 630,
  alt: "Moistello — decentralized savings circles on Stellar",
}

/** Turn a route path into the absolute URL a social scraper should cache. */
export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE_URL
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
