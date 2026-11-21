import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock stellar address validator
vi.mock("@/lib/stellar/validate-address", () => ({
  validateStellarAddress: (addr: string) => addr.length === 56 && addr.startsWith("G"),
}))

// Fetch mock
const mockFetch = vi.fn()
global.fetch = mockFetch

import { GET } from "./route"

function makeBalanceRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/wallet/balance")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString(), { method: "GET" })
}

function makeHorizonResponse(balances: unknown[], status = 200) {
  return new Response(JSON.stringify({ balances }), { status })
}

let _addrSuffix = 30000
function uniqueAddress(): string {
  _addrSuffix++
  const suffix = String(_addrSuffix).slice(-4).padStart(4, "0")
  return "G" + "B".repeat(51) + suffix
}

describe("GET /api/wallet/balance (route-level tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Validation & Bad Request States", () => {
    it("returns 400 when address parameter is missing", async () => {
      const res = await GET(makeBalanceRequest({}))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/Missing required 'address' query parameter/)
    })

    it("returns 400 when address parameter is invalid Stellar address", async () => {
      const res = await GET(makeBalanceRequest({ address: "invalid-stellar-key" }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/Invalid Stellar public key address/)
    })
  })

  describe("Success & Caching States", () => {
    it("fetches balance successfully from Horizon (X-Cache: MISS)", async () => {
      const address = uniqueAddress()
      mockFetch.mockResolvedValueOnce(
        makeHorizonResponse([
          { asset_type: "native", balance: "150.2500000" },
          { asset_code: "USDC", asset_type: "credit_alphanum4", balance: "80.5000000" },
        ])
      )

      const res = await GET(makeBalanceRequest({ address }))
      expect(res.status).toBe(200)
      expect(res.headers.get("X-Cache")).toBe("MISS")

      const data = await res.json()
      expect(data.xlm).toBe("150.2500000")
      expect(data.usdc).toBe("80.5000000")
    })

    it("returns cached balance on subsequent call within TTL (X-Cache: HIT)", async () => {
      const address = uniqueAddress()
      mockFetch.mockResolvedValueOnce(
        makeHorizonResponse([
          { asset_type: "native", balance: "200.0000000" },
          { asset_code: "USDC", balance: "50.0000000" },
        ])
      )

      const res1 = await GET(makeBalanceRequest({ address }))
      expect(res1.status).toBe(200)
      expect(res1.headers.get("X-Cache")).toBe("MISS")

      // Second call should hit the in-memory cache
      const res2 = await GET(makeBalanceRequest({ address }))
      expect(res2.status).toBe(200)
      expect(res2.headers.get("X-Cache")).toBe("HIT")
      const data2 = await res2.json()
      expect(data2.xlm).toBe("200.0000000")
      expect(data2.usdc).toBe("50.0000000")
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("handles unfunded account (Horizon 404) gracefully returning zero balances", async () => {
      const address = uniqueAddress()
      mockFetch.mockResolvedValueOnce(new Response("{}", { status: 404 }))

      const res = await GET(makeBalanceRequest({ address }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.xlm).toBe("0")
      expect(data.usdc).toBe("0")
    })
  })

  describe("Error States", () => {
    it("propagates non-404 Horizon error status", async () => {
      const address = uniqueAddress()
      mockFetch.mockResolvedValueOnce(new Response("Internal Server Error", { status: 503 }))

      const res = await GET(makeBalanceRequest({ address }))
      expect(res.status).toBe(503)
      const data = await res.json()
      expect(data.error).toBe("Horizon returned status 503")
    })

    it("returns 500 when fetch throws a network error", async () => {
      const address = uniqueAddress()
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"))

      const res = await GET(makeBalanceRequest({ address }))
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe("Connection refused")
    })
  })
})
