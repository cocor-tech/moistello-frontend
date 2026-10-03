import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import { INDEXABLE_ROUTES, PUBLIC_ROUTES } from "../route-metadata"
import { absoluteUrl } from "../site"

describe("sitemap", () => {
  const entries = sitemap()

  it("lists every indexable public route exactly once", () => {
    const urls = entries.map((entry) => entry.url)
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls.sort()).toEqual(INDEXABLE_ROUTES.map((route) => absoluteUrl(route.path)).sort())
  })

  it("omits noindex routes so error and utility pages stay out of the index", () => {
    const urls = new Set(entries.map((entry) => entry.url))
    for (const route of PUBLIC_ROUTES.filter((r) => !r.indexable)) {
      expect(urls.has(absoluteUrl(route.path)), `${route.path} must not be in the sitemap`).toBe(false)
    }
  })

  it("uses absolute URLs, which a sitemap entry requires", () => {
    for (const entry of entries) {
      expect(entry.url, `relative sitemap url: ${entry.url}`).toMatch(/^https?:\/\//)
    }
  })

  it("keeps priorities within the 0-1 range search engines accept", () => {
    for (const entry of entries) {
      expect(entry.priority).toBeGreaterThanOrEqual(0)
      expect(entry.priority).toBeLessThanOrEqual(1)
    }
  })
})
