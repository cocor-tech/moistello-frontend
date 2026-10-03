import fs from "node:fs"
import path from "node:path"

import { INDEXABLE_ROUTES, NON_PUBLIC_ROUTE_GROUPS, PUBLIC_ROUTES } from "./route-metadata"
import { OG_IMAGE, SITE_URL, absoluteUrl } from "./site"

/**
 * Static analysis of the App Router tree, used to prove that every public
 * route really does ship a description and OpenGraph tags.
 *
 * The alternative — booting a production build and scraping `<head>` — proves
 * only what a running server produced on the day. Walking the route tree proves
 * the invariant in the source, runs in well under a second, and fails on a
 * contributor's first commit rather than after a deploy.
 */

export type AppRouteFile = {
  /** Repo-relative path, e.g. `src/app/(auth)/login/page.tsx`. */
  file: string
  /** URL pattern the file serves, e.g. `/login` or `/u/[handle]`. */
  pattern: string
  /** True when `pattern` contains a dynamic segment (`[id]`, `[[...slug]]`). */
  isDynamic: boolean
}

export type SeoViolation = {
  /** Route the violation belongs to, or `"<registry>"` for registry-wide issues. */
  route: string
  /** What went wrong, phrased so the message is the fix. */
  message: string
}

export type SeoAuditResult = {
  /** Static and dynamic public routes found under `src/app`. */
  routes: AppRouteFile[]
  violations: SeoViolation[]
}

/** Character budgets. Google truncates meta descriptions near 160 chars and
 * link previews near 200; anything past that is a wasted sentence because
 * nobody will read it. Titles cut off around 60. */
export const LIMITS = {
  title: 70,
  ogTitle: 80,
  description: 200,
  ogDescription: 200,
} as const

const APP_DIR = path.join("src", "app")
const PAGE_FILES = ["page.tsx", "page.ts"]
const LAYOUT_FILES = ["layout.tsx", "layout.ts"]
/** Next.js serves a missing route through this file; it needs metadata too. */
const NOT_FOUND_FILE = "not-found.tsx"

/** Collapse whitespace and case so "Moistello — X" and "moistello - x" collide. */
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

/** Strip a `src/app` directory path down to the URL it serves. */
export function patternFromAppPath(appRelativePath: string): string {
  const withoutRoot = appRelativePath.replace(/^app[\\/]/, "")
  const segments = withoutRoot
    .split(/[\\/]/)
    // Route groups are organisational only — they never appear in the URL.
    .filter((segment) => segment.length > 0 && segment !== "." && !segment.startsWith("("))
  const route = `/${segments.join("/")}`.replace(/\/{2,}/g, "/")
  return route === "/" ? "/" : route.replace(/\/$/, "")
}

function isInNonPublicGroup(appRelativePath: string): boolean {
  return NON_PUBLIC_ROUTE_GROUPS.some((group) => appRelativePath.includes(`${group}/`))
}

function walk(dir: string, onFile: (file: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, onFile)
    else onFile(full)
  }
}

/**
 * Every public page route under `src/app`, as App Router route patterns.
 *
 * Dynamic routes are included but flagged, because they are audited by a
 * different rule: their metadata comes from `generateMetadata`, which is
 * resolved per-request and therefore cannot be enumerated statically.
 */
export function discoverAppRoutes(cwd: string = process.cwd()): AppRouteFile[] {
  const appDir = path.join(cwd, APP_DIR)
  if (!fs.existsSync(appDir)) return []

  const routes: AppRouteFile[] = []
  const appRelative = (file: string) => path.relative(appDir, file).split(path.sep).join("/")
  const repoPathPrefix = APP_DIR.split(path.sep).join("/")

  walk(appDir, (file) => {
    const base = path.basename(file)
    if (!PAGE_FILES.includes(base)) return
    const relative = appRelative(file)
    if (isInNonPublicGroup(relative)) return
    const pattern = patternFromAppPath(path.dirname(relative))
    routes.push({
      file: `${repoPathPrefix}/${relative}`,
      pattern,
      isDynamic: pattern.includes("["),
    })
  })

  if (fs.existsSync(path.join(appDir, NOT_FOUND_FILE))) {
    routes.push({
      file: `${repoPathPrefix}/${NOT_FOUND_FILE}`,
      pattern: "/404",
      isDynamic: false,
    })
  }

  return routes.sort((a, b) => a.pattern.localeCompare(b.pattern))
}

/**
 * Is `path` served by one of the discovered route patterns?
 *
 * A path counts as covered when a static pattern matches it exactly, or when
 * it is the static head of a dynamic one — `/docs` is served by
 * `/docs/[[...slug]]`, so it has no `page.tsx` of its own.
 */
export function isCoveredByRoute(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === path) return true
    return pattern.startsWith(`${path}/`)
  })
}

/**
 * Every file that can supply a route's metadata, outermost first — the layouts
 * along the route's chain plus the page itself.
 *
 * Walking the whole chain rather than just the page's own directory matters:
 * `/docs` has no `page.tsx` at all (the catch-all serves it), so its metadata
 * lives in `app/docs/layout.tsx`, one level above the page. It also covers
 * client pages, which cannot export `metadata` and get it from a sibling
 * layout instead.
 *
 * The root layout is excluded. It is in every chain, so leaving it in would let
 * a single stray `buildRouteMetadata` call satisfy the check for all routes.
 */
function metadataChain(cwd: string, pattern: string): string[] {
  const appDir = path.join(cwd, APP_DIR)
  const repoPathPrefix = APP_DIR.split(path.sep).join("/")
  const rootLayout = `${repoPathPrefix}/layout.tsx`
  const toRepoPath = (absolute: string) =>
    `${repoPathPrefix}/${path.relative(appDir, absolute).split(path.sep).join("/")}`
  const layoutIn = (dir: string) => {
    for (const name of LAYOUT_FILES) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate)) return toRepoPath(candidate)
    }
    return undefined
  }
  const pageIn = (dir: string) => {
    for (const name of PAGE_FILES) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate)) return toRepoPath(candidate)
    }
    return undefined
  }

  // `not-found.tsx` is a special file rather than a directory, so it has no
  // segment to walk down to.
  if (pattern === "/404") {
    return fs.existsSync(path.join(appDir, NOT_FOUND_FILE))
      ? [`${repoPathPrefix}/${NOT_FOUND_FILE}`]
      : []
  }

  const segments = pattern === "/" ? [] : pattern.split("/").filter(Boolean)
  const files: string[] = []
  let frontier: string[] = [appDir]
  let landed: string | undefined

  // Walk one URL segment at a time, keeping every on-disk directory that could
  // hold it. Route groups are transparent in a URL but present on disk, so
  // `/login` is only reachable by stepping through `app/(auth)`. Carrying all
  // candidates forward (rather than committing to the first hit) is what keeps
  // a group nested further down — `app/(auth)/(marketing)/pricing` — from
  // being missed.
  for (const segment of segments) {
    const next: string[] = []
    for (const dir of frontier) {
      // Descend through a route group without consuming a URL segment.
      for (const group of routeGroupsUnder(appDir, dir)) {
        const nested = path.join(dir, group)
        const through = path.join(nested, segment)
        if (fs.existsSync(through)) next.push(through)
      }
      const direct = path.join(dir, segment)
      if (fs.existsSync(direct)) next.push(direct)
    }
    if (next.length === 0) return []
    frontier = next
  }

  for (const dir of frontier) {
    landed = dir
    const layout = layoutIn(dir)
    if (layout) files.push(layout)
  }
  for (const dir of frontier) {
    if (dir === landed) {
      const page = pageIn(dir)
      if (page) files.push(page)
    }
  }

  return files.filter((file) => file !== rootLayout)
}

/** Names of the route-group directories immediately inside `dir`. */
function routeGroupsUnder(appDir: string, dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("(") && entry.name.endsWith(")"))
    .map((entry) => entry.name)
}

function auditRegistry(patterns: string[]): SeoViolation[] {
  const violations: SeoViolation[] = []
  const push = (route: string, message: string) => violations.push({ route, message })

  for (const route of PUBLIC_ROUTES) {
    if (!route.path.startsWith("/")) {
      push(route.path, "path must start with \"/\"")
    }
    for (const [field, value] of [
      ["title", route.title],
      ["description", route.description],
      ["ogTitle", route.ogTitle],
      ["ogDescription", route.ogDescription],
    ] as const) {
      if (!value || !value.trim()) {
        push(route.path, `\`${field}\` is empty — every public route needs its own copy`)
      } else if (value.length > LIMITS[field]) {
        push(route.path, `\`${field}\` is ${value.length} chars, over the ${LIMITS[field]} char budget`)
      }
    }
    if (route.keywords.length === 0) {
      push(route.path, "`keywords` is empty")
    }
    if (route.keywords.some((keyword) => !keyword.trim())) {
      push(route.path, "`keywords` contains a blank entry")
    }
    if (route.indexable && !isCoveredByRoute(route.path, patterns)) {
      push(
        route.path,
        "marked indexable but no page in src/app serves this path — remove it or add the page",
      )
    }
  }

  // The whole point of the registry: per-route copy must actually be per-route.
  for (const field of ["title", "description", "ogTitle", "ogDescription"] as const) {
    const seen = new Map<string, string[]>()
    for (const route of PUBLIC_ROUTES) {
      const key = normalize(route[field])
      seen.set(key, [...(seen.get(key) ?? []), route.path])
    }
    for (const [value, routes] of seen) {
      if (routes.length > 1) {
        push(
          routes.join(", "),
          `shares one \`${field}\` ("${value}") across ${routes.length} routes — every public route needs unique copy`,
        )
      }
    }
  }

  return violations
}

function auditRoutes(cwd: string, routes: AppRouteFile[]): SeoViolation[] {
  const violations: SeoViolation[] = []
  const registered = new Set(PUBLIC_ROUTES.map((route) => route.path))

  for (const route of routes) {
    if (route.isDynamic) {
      // Dynamic routes resolve metadata per request via `generateMetadata`;
      // a static reading of the file is all that can be asserted here.
      const source = fs.readFileSync(path.join(cwd, route.file), "utf-8")
      if (!source.includes("generateMetadata")) {
        violations.push({
          route: route.pattern,
          message: `${route.file} is a public dynamic route but exports no \`generateMetadata\` — add one so it emits a description and OG tags per record`,
        })
      }
      continue
    }

    if (!registered.has(route.pattern)) {
      violations.push({
        route: route.pattern,
        message: `${route.file} is a public route with no entry in PUBLIC_ROUTES — add one in src/lib/seo/route-metadata.ts`,
      })
      continue
    }

    const chain = metadataChain(cwd, route.pattern)
    if (chain.length === 0) {
      violations.push({
        route: route.pattern,
        message: `could not locate the page or layout that serves this route`,
      })
      continue
    }
    // Match the exact call, not just the identifier: a route wired to another
    // route's entry would otherwise look wired up.
    const call = `buildRouteMetadata(${JSON.stringify(route.pattern)})`
    if (!chain.some((file) => fs.readFileSync(path.join(cwd, file), "utf-8").includes(call))) {
      violations.push({
        route: route.pattern,
        message: `none of ${chain.join(", ")} calls \`${call}\` — hand-rolled metadata is how the OG tags went missing in the first place`,
      })
    }
  }

  return violations
}

/**
 * Run every SEO check and return the violations. An empty `violations` array is
 * the pass condition for `scripts/audit-seo-routes.mjs`.
 */
export function auditSeoRoutes(cwd: string = process.cwd()): SeoAuditResult {
  const routes = discoverAppRoutes(cwd)
  const patterns = routes.map((route) => route.pattern)
  return {
    routes,
    violations: [...auditRegistry(patterns), ...auditRoutes(cwd, routes)],
  }
}

/** Sitemap entries the registry implies, for cross-checking `sitemap.ts`. */
export function sitemapPaths(): string[] {
  return INDEXABLE_ROUTES.map((route) => route.path)
}

export { OG_IMAGE, SITE_URL, absoluteUrl }
