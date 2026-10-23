import { afterEach, describe, expect, it, vi } from "vitest"

// SITE_URL is computed from NEXT_PUBLIC_APP_URL when the module loads, so each
// test stubs the variable and loads a fresh copy of the module.
async function loadSite() {
  vi.resetModules()
  return import("../site")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("SITE_URL", () => {
  it("falls back to the production origin when NEXT_PUBLIC_APP_URL is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    const site = await loadSite()

    expect(site.SITE_URL).toBe("https://moistello.com")
  })

  it("uses the origin of a configured absolute URL, dropping its path and query", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.moistello.com/some/path?x=1")
    const site = await loadSite()

    expect(site.SITE_URL).toBe("https://preview.moistello.com")
  })

  it("falls back to the production origin when NEXT_PUBLIC_APP_URL is not an absolute URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "/relative/path")
    const site = await loadSite()

    expect(site.SITE_URL).toBe("https://moistello.com")
  })
})

describe("absoluteUrl", () => {
  it("resolves the root path to the bare site origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    const site = await loadSite()

    expect(site.absoluteUrl("/")).toBe("https://moistello.com")
    expect(site.absoluteUrl("")).toBe("https://moistello.com")
  })

  it("keeps a leading-slash path as-is on the site origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    const site = await loadSite()

    expect(site.absoluteUrl("/circles")).toBe("https://moistello.com/circles")
  })

  it("adds the missing leading slash to a relative path", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    const site = await loadSite()

    expect(site.absoluteUrl("circles")).toBe("https://moistello.com/circles")
  })

  it("resolves against a configured preview origin rather than production", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.moistello.com")
    const site = await loadSite()

    expect(site.absoluteUrl("/circles")).toBe("https://preview.moistello.com/circles")
  })
})

describe("OG_IMAGE", () => {
  it("points at the 1200x630 social card served from public/", async () => {
    const site = await loadSite()

    expect(site.OG_IMAGE.url).toBe("/logo.jpg")
    expect(site.OG_IMAGE.width).toBe(1200)
    expect(site.OG_IMAGE.height).toBe(630)
  })
})
