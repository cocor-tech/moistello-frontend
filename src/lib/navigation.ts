import { Routes } from "./constants";

/**
 * Determines whether a navigation link should be marked active based on current pathname.
 *
 * Rules:
 * - Exact match: always active (e.g. pathname === href).
 * - Root / Dashboard: only matches exact root ("/") to avoid false-matching all paths.
 * - Nested routes: active if pathname is a subpath of href delimited by "/"
 *   (e.g. href = "/circles", pathname = "/circles/123/settings" -> true).
 * - Sibling collision prevention: href = "/circles" does NOT match "/circles-archive"
 *   because there is no boundary "/" separator.
 * - Trailing slash normalization: ignores trailing slashes for clean matching.
 *
 * @param pathname Current route pathname from Next.js usePathname()
 * @param href Navigation item target route href
 * @returns boolean
 */
export function isRouteActive(
  pathname: string | null | undefined,
  href: string
): boolean {
  if (!pathname || !href) return false;

  // Normalize by removing trailing slashes except for root "/"
  const cleanPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const cleanHref =
    href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;

  // Root or dashboard route must be an exact match
  if (cleanHref === "/" || cleanHref === Routes.DASHBOARD) {
    return cleanPath === "/" || cleanPath === Routes.DASHBOARD;
  }

  // Exact match or subpath prefix with boundary slash
  return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
}
