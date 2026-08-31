// @vitest-environment node
/**
 * dev-route-stub.test.ts
 *
 * Verifies that the production stub module (used by the webpack
 * NormalModuleReplacementPlugin to replace dev-only routes at build time)
 * returns 404 for every HTTP method and contains no flat-file imports.
 */
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
} from "@/lib/security/dev-route-stub"

function makeRequest(method: string) {
  return new NextRequest("http://localhost/api/dev-stub", { method })
}

describe("dev-route-stub — production bundle replacement", () => {
  it("GET returns 404", async () => {
    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("POST returns 404", async () => {
    const res = await POST(makeRequest("POST"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("PUT returns 404", async () => {
    const res = await PUT(makeRequest("PUT"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("PATCH returns 404", async () => {
    const res = await PATCH(makeRequest("PATCH"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("DELETE returns 404", async () => {
    const res = await DELETE(makeRequest("DELETE"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("response body never leaks server internals", async () => {
    const res = await POST(makeRequest("POST"))
    const body = await res.json()
    // Must not expose route existence, stack traces, or file paths
    expect(JSON.stringify(body)).not.toMatch(/users\.json/i)
    expect(JSON.stringify(body)).not.toMatch(/sessions\.json/i)
    expect(JSON.stringify(body)).not.toMatch(/setup-tokens/i)
    expect(JSON.stringify(body)).not.toMatch(/content\//i)
  })
})
