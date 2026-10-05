import { describe, expect, it } from "vitest"

import {
  INDEXABLE_ROUTES,
  PUBLIC_ROUTES,
  buildRouteMetadata,
  getRouteSeo,
} from "../route-metadata"
import { LIMITS } from "../route-audit"
import { OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "../site"

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase()

describe("public route registry", () => {
  it("registers no duplicate route paths", () => {
    const paths = PUBLIC_ROUTES.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("normalizes every path to a leading slash and no trailing slash", () => {
    for (const route of PUBLIC_ROUTES) {
      expect(route.path.startsWith("/"), `${route.path} must start with "/"`).toBe(true)
      // "/" is the root and legitimately has no further segments.
      if (route.path !== "/") {
        expect(route.path, `${route.path} must not end with a slash`).not.toMatch(/\/$/)
      }
      expect(route.path).not.toContain("//")
    }
  })

  // The headline acceptance criterion: a repeated description is the exact bug
  // this registry exists to prevent, so it is asserted, not assumed.
  it.each(["title", "description", "ogTitle", "ogDescription"] as const)(
    "gives every public route a unique %s",
    (field) => {
      const seen = new Map<string, string[]>()
      for (const route of PUBLIC_ROUTES) {
        const key = normalize(route[field])
        expect(key, `${route.path} has an empty ${field}`).not.toBe("")
        seen.set(key, [...(seen.get(key) ?? []), route.path])
      }
      const duplicates = [...seen.entries()].filter(([, routes]) => routes.length > 1)
      expect(
        duplicates.map(([value, routes]) => `${routes.join(" + ")} share "${value}"`),
        `duplicate ${field} across public routes`,
      ).toEqual([])
    },
  )

  it.each([
    ["title", LIMITS.title],
    ["ogTitle", LIMITS.ogTitle],
    ["description", LIMITS.description],
    ["ogDescription", LIMITS.ogDescription],
  ] as const)("keeps %s within the %i char budget", (field, limit) => {
    for (const route of PUBLIC_ROUTES) {
      expect(
        route[field].length,
        `${route.path} has a ${route[field].length} char ${field} (limit ${limit})`,
      ).toBeLessThanOrEqual(limit)
    }
  })

  it("gives every public route at least one keyword and no blank ones", () => {
    for (const route of PUBLIC_ROUTES) {
      expect(route.keywords.length, `${route.path} has no keywords`).toBeGreaterThan(0)
      for (const keyword of route.keywords) {
        expect(keyword.trim(), `${route.path} has a blank keyword`).not.toBe("")
      }
    }
  })

  it("keeps INDEXABLE_ROUTES in sync with the indexable flag", () => {
    expect(INDEXABLE_ROUTES.map((r) => r.path)).toEqual(
      PUBLIC_ROUTES.filter((r) => r.indexable).map((r) => r.path),
    )
    expect(INDEXABLE_ROUTES.length).toBeGreaterThan(0)
  })
})

describe("buildRouteMetadata", () => {
  it("emits a description, canonical and robots directives for every route", () => {
    for (const route of PUBLIC_ROUTES) {
      const metadata = buildRouteMetadata(route.path)
      expect(metadata.description, `${route.path} has no description`).toBe(route.description)
      expect(metadata.title).toBe(route.title)
      expect(metadata.alternates?.canonical).toBe(route.path)
      expect(metadata.robots).toEqual(
        route.indexable ? { index: true, follow: true } : { index: false, follow: false },
      )
    }
  })

  it("emits complete OpenGraph and Twitter tags for every route", () => {
    for (const route of PUBLIC_ROUTES) {
      // Next types `openGraph`/`twitter` as unions over every OG flavour, so
      // the concrete shapes are narrowed before their fields can be read.
      const { openGraph, twitter } = buildRouteMetadata(route.path) as {
        openGraph: { type?: string; title?: string; description?: string; url?: string; siteName?: string; locale?: string; images?: unknown }
        twitter: { card?: string; title?: string; description?: string; images?: unknown }
      }
      const where = route.path

      expect(openGraph.title, `${where} missing og:title`).toBe(route.ogTitle)
      expect(openGraph.description, `${where} missing og:description`).toBe(route.ogDescription)
      expect(openGraph.url, `${where} missing og:url`).toBe(absoluteUrl(route.path))
      expect(openGraph.siteName).toBe(SITE_NAME)
      expect(openGraph.type).toBe(route.ogType ?? "website")
      expect(openGraph.locale).toBe("en_US")
      expect(Array.isArray(openGraph.images) ? openGraph.images[0] : undefined).toMatchObject(
        OG_IMAGE,
      )

      expect(twitter.card, `${where} missing twitter:card`).toBe("summary_large_image")
      expect(twitter.title, `${where} missing twitter:title`).toBe(route.ogTitle)
      expect(twitter.description, `${where} missing twitter:description`).toBe(route.ogDescription)
      expect(twitter.images).toEqual([OG_IMAGE.url])
    }
  })

  it("marks utility and error routes noindex while keeping them described", () => {
    for (const path of ["/setup", "/upload", "/404", "/internal-error", "/service-unavailable"]) {
      const metadata = buildRouteMetadata(path)
      expect(metadata.robots, `${path} must stay out of the index`).toMatchObject({
        index: false,
        follow: false,
      })
      // A shared 404 or 500 link still has to describe itself.
      expect(metadata.description).toBeTruthy()
      expect(metadata.openGraph?.description).toBeTruthy()
    }
  })

  it("resolves og:url against the configured site origin", () => {
    expect(absoluteUrl("/")).toBe(SITE_URL)
    expect(absoluteUrl("/faq")).toBe(`${SITE_URL}/faq`)
    expect(buildRouteMetadata("/faq").openGraph?.url).toBe(`${SITE_URL}/faq`)
  })

  it("throws for an unregistered path instead of emitting an empty description", () => {
    expect(() => buildRouteMetadata("/not-registered")).toThrow(/No SEO entry registered/)
  })
})

describe("getRouteSeo", () => {
  it("looks routes up by path", () => {
    expect(getRouteSeo("/about")?.path).toBe("/about")
    expect(getRouteSeo("/nope")).toBeUndefined()
  })
})
