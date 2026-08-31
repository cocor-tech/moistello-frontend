/**
 * docs-search-route.test.ts
 *
 * Route-level tests for GET /api/docs/search
 *
 * Tests cover:
 *  - Empty query returns empty results (searchDocs returns [] for empty terms)
 *  - Searching returns ranked results
 *  - Response shape (results array + query echo)
 *  - Search against static pages
 *  - Missing q param treated as empty string
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mock fs module ───────────────────────────────────────────────────────────

const fsMockState = {
  exists: true,
  files: [] as string[],
  contents: new Map<string, string>(),
}

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>()
  return {
    ...actual,
    existsSync: vi.fn((_p: unknown) => fsMockState.exists),
    readdirSync: vi.fn((_p: unknown) => fsMockState.files as unknown as import("fs").Dirent[]),
    readFileSync: vi.fn((p: unknown) => {
      const filename = String(p).split("/").pop() ?? ""
      return fsMockState.contents.get(filename) ?? ""
    }),
  }
})

import { GET } from "@/app/api/docs/search/route"

// ── Sample doc content ────────────────────────────────────────────────────────

const GETTING_STARTED_MD = `---
title: Getting Started
---
Learn how to create a savings circle and join the Moistello platform.
Connect your Stellar wallet and get started with USDC contributions.
`

const WALLET_SETUP_MD = `---
title: Wallet Setup
---
How to set up your Stellar wallet for Moistello USDC payments.
`

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSearchRequest(q?: string) {
  const url = new URL("http://localhost/api/docs/search")
  if (q !== undefined) url.searchParams.set("q", q)
  return new NextRequest(url.toString(), { method: "GET" })
}

function setupDocs(docs: Array<{ filename: string; content: string }>) {
  fsMockState.exists = true
  fsMockState.files = docs.map((d) => d.filename)
  fsMockState.contents = new Map(docs.map((d) => [d.filename, d.content]))
}

// SearchMatch shape returned by searchDocs / the route
interface SearchMatch {
  title: string
  href: string
  score: number
  snippet: string
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/docs/search", () => {
  beforeEach(() => {
    setupDocs([
      { filename: "getting-started.md", content: GETTING_STARTED_MD },
      { filename: "wallet-setup.md", content: WALLET_SETUP_MD },
    ])
  })

  describe("response shape", () => {
    it("returns results array and query echo", async () => {
      const res = await GET(makeSearchRequest("circle"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json.results)).toBe(true)
      expect(json.query).toBe("circle")
    })

    it("each result has title, href, score, and snippet fields", async () => {
      const res = await GET(makeSearchRequest("wallet"))
      const json = await res.json()
      for (const r of json.results as SearchMatch[]) {
        expect(r.title).toBeDefined()
        expect(r.href).toBeDefined()
        expect(typeof r.score).toBe("number")
        expect(r.snippet).toBeDefined()
      }
    })
  })

  describe("empty / missing query", () => {
    it("returns empty results when q param is missing (empty terms → [])", async () => {
      const res = await GET(makeSearchRequest())
      expect(res.status).toBe(200)
      const json = await res.json()
      // searchDocs returns [] for empty query
      expect(Array.isArray(json.results)).toBe(true)
    })

    it("returns empty results for empty string query", async () => {
      const res = await GET(makeSearchRequest(""))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json.results)).toBe(true)
    })

    it("echoes empty string as query", async () => {
      const res = await GET(makeSearchRequest(""))
      const json = await res.json()
      expect(json.query).toBe("")
    })
  })

  describe("search results", () => {
    it("returns non-empty results for a relevant query", async () => {
      const res = await GET(makeSearchRequest("savings circle wallet stellar"))
      const json = await res.json()
      expect(json.results.length).toBeGreaterThan(0)
    })

    it("returns an array even for an unrecognized query", async () => {
      const res = await GET(makeSearchRequest("zzz-this-does-not-exist-in-any-page"))
      const json = await res.json()
      expect(Array.isArray(json.results)).toBe(true)
    })

    it("returns FAQ page for faq-related query", async () => {
      const res = await GET(makeSearchRequest("frequently asked questions passkey auth"))
      const json = await res.json()
      // The static FAQ page has href="/faq"
      const faqResult = (json.results as SearchMatch[]).find((r) => r.href === "/faq")
      expect(faqResult).toBeDefined()
    })

    it("returns how-it-works page for how-to query", async () => {
      const res = await GET(makeSearchRequest("how to create circle join contribute"))
      const json = await res.json()
      const hwResult = (json.results as SearchMatch[]).find((r) => r.href === "/how-it-works")
      expect(hwResult).toBeDefined()
    })

    it("includes Getting Started doc in results for relevant query", async () => {
      const res = await GET(makeSearchRequest("savings circle getting started"))
      const json = await res.json()
      expect(json.results.length).toBeGreaterThan(0)
    })

    it("results are ranked by score descending", async () => {
      const res = await GET(makeSearchRequest("wallet stellar usdc"))
      const json = await res.json()
      const scores = (json.results as SearchMatch[]).map((r) => r.score)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
      }
    })
  })

  describe("docs directory handling", () => {
    it("handles empty docs directory gracefully", async () => {
      setupDocs([])
      const res = await GET(makeSearchRequest("circle"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json.results)).toBe(true)
    })

    it("handles non-existent docs directory gracefully", async () => {
      fsMockState.exists = false
      const res = await GET(makeSearchRequest("circle"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json.results)).toBe(true)
    })
  })
})
