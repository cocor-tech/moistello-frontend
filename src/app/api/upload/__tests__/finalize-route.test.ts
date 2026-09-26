// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fs from "fs"

import { POST } from "../finalize/route"

const SESSION_COOKIE = "moistello_session=valid-token"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/upload/finalize", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { cookie: SESSION_COOKIE, "content-type": "application/json" },
  })
}

/** Requests without the session cookie, for the auth-guard assertion. */
function makeAnonymousRequest(body: unknown) {
  return new NextRequest("http://localhost/api/upload/finalize", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

describe("POST /api/upload/finalize", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development")

    // Spies are installed per-test: `restoreAllMocks` in afterEach detaches
    // them, so describe-scoped spies would stop intercepting after test one.
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as never)
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {})
    vi.spyOn(fs, "readFileSync").mockImplementation(((...args: unknown[]) => {
      const p = String(args[0])
      if (p.includes("sessions.json")) {
        return JSON.stringify([{ token: "valid-token", createdAt: Date.now() }])
      }
      return ""
    }) as typeof fs.readFileSync)
    // Only sessions.json exists, so nothing is ever staged.
    vi.spyOn(fs, "existsSync").mockImplementation(((...args: unknown[]) =>
      String(args[0]).includes("sessions.json")) as typeof fs.existsSync)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await POST(makeRequest({ uploadId: "abc" }))
    expect(res.status).toBe(404)
  })

  it("returns 401 without a session cookie", async () => {
    const res = await POST(makeAnonymousRequest({ uploadId: "abc" }))
    expect(res.status).toBe(401)
  })

  it("rejects an uploadId that is not a server-generated uuid", async () => {
    const res = await POST(makeRequest({ uploadId: "../../../etc/passwd" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/uploadId/i)
  })

  it("rejects an encoded traversal-shaped uploadId", async () => {
    const res = await POST(makeRequest({ uploadId: "..%2F..%2Fsecret" }))
    expect(res.status).toBe(400)
  })

  it("rejects a missing uploadId", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("returns 400 for a malformed JSON body", async () => {
    const res = await POST(makeRequest("not-json"))
    expect(res.status).toBe(400)
  })

  it("returns 410 when the staged upload is gone", async () => {
    const res = await POST(
      makeRequest({ uploadId: "11111111-2222-4333-8444-555555555555" }),
    )
    expect(res.status).toBe(410)
  })
})
