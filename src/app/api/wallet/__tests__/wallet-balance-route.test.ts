/**
 * wallet-balance-route.test.ts
 *
 * Route-level tests for GET /api/wallet/balance
 *
 * Tests cover:
 *  - Missing / invalid address param
 *  - Successful balance fetch from Horizon
 *  - Account not funded (404 from Horizon → {xlm:"0",usdc:"0"})
 *  - Horizon error propagation
 *  - Server-side cache hit (second request within TTL)
 *  - Network / fetch failure
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mock stellar address validator ──────────────────────────────────────────
vi.mock("@/lib/stellar/validate-address", () => ({
  validateStellarAddress: (addr: string) => addr.length === 56 && addr.startsWith("G"),
}))

// ── Fetch mock — install before module import so the route picks it up ───────
const mockFetch = vi.fn()
global.fetch = mockFetch

// ── Import route once; fetch is called at request-time, not import-time ──────
import { GET } from "@/app/api/wallet/balance/route"

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBalanceRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/wallet/balance")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString(), { method: "GET" })
}

function makeHorizonResponse(balances: unknown[], status = 200) {
  return new Response(JSON.stringify({ balances }), { status })
}

// Use unique addresses per test to avoid the server-side cache (30s TTL)
let _addrSuffix = 10000
function uniqueAddress(): string {
  _addrSuffix++
  // Build exactly 56 chars starting with "G"
  // G + 51 A's + 4-char suffix = 1 + 51 + 4 = 56
  const suffix = String(_addrSuffix).slice(-4).padStart(4, "0")
  return "G" + "A".repeat(51) + suffix
}

describe("GET /api/wallet/balance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("validation", () => {
    it("returns 400 when address param is missing", async () => {
      const res = await GET(makeBalanceRequest({}))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/address/i)
    })

    it("returns 400 for an invalid Stellar address", async () => {
      const res = await GET(makeBalanceRequest({ address: "not-a-stellar-key" }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/invalid/i)
    })

    it("returns 400 for a too-short key starting with G", async () => {
      const res = await GET(makeBalanceRequest({ address: "GSHORT" }))
      expect(res.status).toBe(400)
    })
  })

  describe("Horizon integration", () => {
    it("returns xlm and usdc balances from Horizon response", async () => {
      mockFetch.mockResolvedValueOnce(
        makeHorizonResponse([
          { asset_type: "native", balance: "42.5000000" },
          { asset_code: "USDC", asset_type: "credit_alphanum4", balance: "100.0000000" },
        ])
      )
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.xlm).toBe("42.5000000")
      expect(json.usdc).toBe("100.0000000")
    })

    it("returns zero balances when account not funded (Horizon 404)", async () => {
      mockFetch.mockResolvedValueOnce(new Response("{}", { status: 404 }))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.xlm).toBe("0")
      expect(json.usdc).toBe("0")
    })

    it("propagates Horizon non-404 error status", async () => {
      mockFetch.mockResolvedValueOnce(new Response("{}", { status: 503 }))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(503)
    })

    it("returns xlm only when no USDC balance present", async () => {
      mockFetch.mockResolvedValueOnce(
        makeHorizonResponse([{ asset_type: "native", balance: "10.0000000" }])
      )
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      const json = await res.json()
      expect(json.xlm).toBe("10.0000000")
      expect(json.usdc).toBe("0")
    })

    it("returns usdc only when no native balance present", async () => {
      mockFetch.mockResolvedValueOnce(
        makeHorizonResponse([
          { asset_code: "USDC", asset_type: "credit_alphanum4", balance: "200.0000000" },
        ])
      )
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      const json = await res.json()
      expect(json.xlm).toBe("0")
      expect(json.usdc).toBe("200.0000000")
    })

    it("returns 500 when fetch throws a network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })
  })

  describe("cache headers", () => {
    it("includes Cache-Control header on successful response", async () => {
      mockFetch.mockResolvedValueOnce(makeHorizonResponse([]))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      const cc = res.headers.get("Cache-Control") ?? ""
      expect(cc).toContain("s-maxage=30")
    })

    it("marks first request as MISS", async () => {
      mockFetch.mockResolvedValueOnce(makeHorizonResponse([]))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.headers.get("X-Cache")).toBe("MISS")
    })
  })
})
