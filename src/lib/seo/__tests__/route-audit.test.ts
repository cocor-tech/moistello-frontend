import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"

import {
  auditSeoRoutes,
  discoverAppRoutes,
  isCoveredByRoute,
  patternFromAppPath,
  type SeoViolation,
} from "../route-audit"
import { PUBLIC_ROUTES } from "../route-metadata"

/** Build a throwaway App Router tree the audit can be pointed at. */
function scaffold(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "seo-audit-test-"))
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, contents)
  }
  return root
}

const roots: string[] = []
function makeTree(files: Record<string, string>): string {
  const root = scaffold(files)
  roots.push(root)
  return root
}

afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true })
})

/**
 * Violations scoped to one route. A bare scaffold tree has no pages for the
 * other registered routes, so `auditRegistry` legitimately reports those as
 * "no page in src/app serves this path" — noise for the case under test.
 */
function violationsFor(violations: SeoViolation[], route: string): SeoViolation[] {
  return violations.filter((violation) => violation.route === route)
}

describe("patternFromAppPath", () => {
  it("maps App Router directories to URL paths", () => {
    expect(patternFromAppPath("about")).toBe("/about")
    expect(patternFromAppPath("how-it-works")).toBe("/how-it-works")
    expect(patternFromAppPath("u/[handle]")).toBe("/u/[handle]")
    expect(patternFromAppPath("p/[[...slug]]")).toBe("/p/[[...slug]]")
  })

  it("drops route groups, which never appear in a URL", () => {
    expect(patternFromAppPath("(auth)/login")).toBe("/login")
    expect(patternFromAppPath("(dashboard)/circles/saved")).toBe("/circles/saved")
  })

  it("maps the app root to /", () => {
    expect(patternFromAppPath(".")).toBe("/")
    expect(patternFromAppPath("")).toBe("/")
  })
})

describe("isCoveredByRoute", () => {
  it("matches static patterns exactly", () => {
    expect(isCoveredByRoute("/about", ["/about", "/faq"])).toBe(true)
    expect(isCoveredByRoute("/terms", ["/about"])).toBe(false)
  })

  it("treats the static head of a dynamic pattern as covered", () => {
    // /docs has no page.tsx of its own — the catch-all serves it.
    expect(isCoveredByRoute("/docs", ["/docs/[[...slug]]"])).toBe(true)
  })
})

describe("discoverAppRoutes", () => {
  it("finds public pages, dynamic routes and not-found", () => {
    const root = makeTree({
      "src/app/page.tsx": "export default function P() {}",
      "src/app/about/page.tsx": "export default function P() {}",
      "src/app/(auth)/login/page.tsx": "export default function P() {}",
      "src/app/u/[handle]/page.tsx": "export default function P() {}",
      "src/app/(dashboard)/wallet/page.tsx": "export default function P() {}",
      "src/app/not-found.tsx": "export default function P() {}",
    })

    const patterns = discoverAppRoutes(root).map((route) => route.pattern)
    // localeCompare orders digits before letters, so "/404" precedes "/about".
    expect(patterns).toEqual(["/", "/404", "/about", "/login", "/u/[handle]"])
  })

  it("excludes auth-gated route groups", () => {
    const root = makeTree({
      "src/app/(dashboard)/circles/[id]/page.tsx": "export default function P() {}",
    })
    expect(discoverAppRoutes(root)).toEqual([])
  })

  it("flags dynamic routes so they are audited by their own rule", () => {
    const root = makeTree({ "src/app/u/[handle]/page.tsx": "export default function P() {}" })
    const [route] = discoverAppRoutes(root)
    expect(route).toMatchObject({ pattern: "/u/[handle]", isDynamic: true })
  })

  it("returns nothing when src/app is absent", () => {
    expect(discoverAppRoutes(scaffold({}))).toEqual([])
  })
})

describe("auditSeoRoutes", () => {
  it("passes on this repository — every public route is described", () => {
    const { routes, violations } = auditSeoRoutes(process.cwd())
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    // Guard against the audit silently checking nothing.
    expect(routes.length).toBeGreaterThan(10)
  })

  it("flags a public page with no registry entry", () => {
    const root = makeTree({ "src/app/new-thing/page.tsx": "export default function P() {}" })
    const { violations } = auditSeoRoutes(root)
    expect(violations.some((v) => v.route === "/new-thing" && /no entry in PUBLIC_ROUTES/.test(v.message))).toBe(true)
  })

  it("flags a public page that hand-rolls metadata instead of using the registry", () => {
    const registered = PUBLIC_ROUTES.find((route) => route.path === "/about")!
    const root = makeTree({
      "src/app/about/page.tsx": [
        "export const metadata = {",
        `  description: ${JSON.stringify(registered.description)},`,
        "}",
        "export default function P() {}",
      ].join("\n"),
    })
    const { violations } = auditSeoRoutes(root)
    expect(
      violations.some((v) => v.route === "/about" && /buildRouteMetadata/.test(v.message)),
    ).toBe(true)
  })

  it("accepts a page that builds its metadata from the registry", () => {
    const root = makeTree({
      "src/app/about/page.tsx": [
        'import { buildRouteMetadata } from "@/lib/seo/route-metadata"',
        'export const metadata = buildRouteMetadata("/about")',
        "export default function P() {}",
      ].join("\n"),
    })
    expect(violationsFor(auditSeoRoutes(root).violations, "/about")).toEqual([])
  })

  it("accepts a client page whose metadata lives in a sibling layout", () => {
    // A "use client" module cannot export metadata, so the layout supplies it.
    const root = makeTree({
      "src/app/setup/page.tsx": ['"use client"', "export default function P() {}"].join("\n"),
      "src/app/setup/layout.tsx": [
        'import { buildRouteMetadata } from "@/lib/seo/route-metadata"',
        'export const metadata = buildRouteMetadata("/setup")',
        "export default function L({ children }) { return children }",
      ].join("\n"),
    })
    expect(violationsFor(auditSeoRoutes(root).violations, "/setup")).toEqual([])
  })

  it("accepts a route whose metadata lives in an intermediate layout", () => {
    // /docs has no page.tsx — the catch-all serves it, so the description has
    // to come from app/docs/layout.tsx one level up.
    const root = makeTree({
      "src/app/layout.tsx": "export default function L({ children }) { return children }",
      "src/app/docs/layout.tsx": [
        'import { buildRouteMetadata } from "@/lib/seo/route-metadata"',
        'export const metadata = buildRouteMetadata("/docs")',
        "export default function L({ children }) { return children }",
      ].join("\n"),
      "src/app/docs/[[...slug]]/page.tsx": "export async function generateMetadata() {}\nexport default function P() {}",
    })
    const { routes, violations } = auditSeoRoutes(root)
    expect(routes.map((r) => r.pattern)).toEqual(["/docs/[[...slug]]"])
    expect(violationsFor(violations, "/docs/[[...slug]]")).toEqual([])
  })

  it("does not let the shared root layout satisfy a route's check", () => {
    const root = makeTree({
      "src/app/layout.tsx": [
        'import { buildRouteMetadata } from "@/lib/seo/route-metadata"',
        'export const metadata = buildRouteMetadata("/about")',
        "export default function L({ children }) { return children }",
      ].join("\n"),
      "src/app/about/page.tsx": "export default function P() {}",
    })
    const { violations } = auditSeoRoutes(root)
    expect(
      violations.some((v) => v.route === "/about" && /buildRouteMetadata/.test(v.message)),
    ).toBe(true)
  })

  it("flags a public dynamic route with no generateMetadata", () => {
    const root = makeTree({ "src/app/p/[[...slug]]/page.tsx": "export default function P() {}" })
    const { violations } = auditSeoRoutes(root)
    expect(
      violations.some((v) => v.route === "/p/[[...slug]]" && /generateMetadata/.test(v.message)),
    ).toBe(true)
  })

  it("flags an indexable registry entry that no page serves", () => {
    const { violations } = auditSeoRoutes(scaffold({}))
    expect(
      violations.some((v) => v.route === "/about" && /no page in src\/app serves/.test(v.message)),
    ).toBe(true)
  })
})
