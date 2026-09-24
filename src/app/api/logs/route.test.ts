import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger")
  return { ...actual, writeServerLog: vi.fn() }
})

import { writeServerLog } from "@/lib/logger"
import { POST } from "./route"

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

describe("POST /api/logs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts a redacted structured event batch", async () => {
    const response = await POST(request([{ level: "info", message: "ready", context: { token: "secret" } }]))
    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: 1 })
  })

  it("drops debug events at the production ingestion boundary", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const response = await POST(request([{ level: "debug", message: "noisy detail" }]))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: 0 })
    expect(writeServerLog).not.toHaveBeenCalled()
  })

  it("rejects malformed and oversized payloads", async () => {
    expect((await POST(request("not-json"))).status).toBe(400)
    expect((await POST(request([], { "content-length": "70000" }))).status).toBe(413)
  })

  it("enforces the body limit while streaming when content-length is absent", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(65_537))
        controller.close()
      },
    })
    const streamedRequest = new NextRequest("http://localhost/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.10" },
      body: stream,
      duplex: "half",
    } as RequestInit)

    const response = await POST(streamedRequest)
    expect(response.status).toBe(413)
  })

  it("rejects invalid content-length values", async () => {
    const response = await POST(request([], { "content-length": "1.5" }))
    expect(response.status).toBe(400)
  })

  it("rate limits a client and returns a retry hint", async () => {
    const headers = { "x-forwarded-for": "198.51.100.11" }
    for (let index = 0; index < 60; index += 1) {
      const response = await POST(request([{ level: "info", message: `event-${index}` }], headers))
      expect(response.status).toBe(202)
    }

    const response = await POST(request([{ level: "info", message: "limited" }], headers))
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("60")
  })
})
