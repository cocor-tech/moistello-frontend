// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger")
  return {
    ...actual,
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }
})

import { logger } from "@/lib/logger"
import { POST } from "./route"

/**
 * The content type the browser uses for each directive. The route accepts
 * anything and parses as JSON either way, so these are the realistic inputs
 * rather than requirements.
 */
const REPORT_URI_CONTENT_TYPE = "application/csp-report"
const REPORT_TO_CONTENT_TYPE = "application/reports+json"

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/csp-report", {
    method: "POST",
    headers: { "Content-Type": REPORT_TO_CONTENT_TYPE, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

function violation(overrides: Record<string, unknown> = {}) {
  return {
    type: "csp-violation",
    body: {
      documentURL: "https://moistello.com/wallet",
      violatedDirective: "script-src",
      blockedURL: "https://cdn.attacker.example/t.js",
      disposition: "report",
      statusCode: 200,
      ...overrides,
    },
  }
}

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts a report posted via report-uri", async () => {
    const response = await POST(
      request(
        {
          "document-uri": "https://moistello.com/",
          "violated-directive": "script-src-elem",
          "blocked-uri": "https://cdn.attacker.example/t.js",
          type: "csp-violation",
        },
        { "Content-Type": REPORT_URI_CONTENT_TYPE },
      ),
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: 1 })
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it("accepts a report posted via report-to", async () => {
    const response = await POST(request(violation()))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: 1 })
  })

  // warn, not error: during report-only validation a violation is the expected
  // output, not a fault. Routing it at error level would page the Sentry alert
  // owner every time someone correctly trialled a policy.
  it("logs at warn so report-only validation does not page anyone", async () => {
    await POST(request(violation()))

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("emits the blocked resource and directive as queryable context", async () => {
    await POST(request(violation()))

    const [message, context] = vi.mocked(logger.warn).mock.calls[0]
    expect(message).toContain("script-src")
    expect(context).toMatchObject({
      blockedUri: "https://cdn.attacker.example/t.js",
      documentUri: "https://moistello.com/wallet",
      disposition: "report",
    })
  })

  it("keeps a mixed batch and counts only the valid entries", async () => {
    const response = await POST(
      request([violation(), { type: "deprecation" }, violation({ blockedURL: "inline" })]),
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: 2 })
  })

  it("rejects a body with no recognisable violation", async () => {
    const response = await POST(request({ type: "deprecation" }))

    expect(response.status).toBe(400)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("rejects malformed JSON", async () => {
    const response = await POST(request("not-json"))

    expect(response.status).toBe(400)
  })

  it("rejects an oversized declared body", async () => {
    const response = await POST(request([], { "content-length": "70000" }))

    expect(response.status).toBe(413)
  })

  it("enforces the body limit while streaming when content-length is absent", async () => {
    // A chunked request has no declared length, so the streaming counter is the
    // only thing standing between this endpoint and an unbounded allocation.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(65_537))
        controller.close()
      },
    })
    const streamedRequest = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "Content-Type": REPORT_TO_CONTENT_TYPE, "x-forwarded-for": "198.51.100.20" },
      body: stream,
      duplex: "half",
    } as unknown as ConstructorParameters<typeof NextRequest>[1])

    const response = await POST(streamedRequest)

    expect(response.status).toBe(413)
  })

  it.each(["1.5", "0x100", "1e3", "+1"])("rejects the invalid content-length %s", async (contentLength) => {
    const response = await POST(request([], { "content-length": contentLength }))

    expect(response.status).toBe(400)
  })

  // A violated policy means a third-party script is being blocked on every page
  // load, which can be a great many reports per client. The cap has to leave
  // room for a real burst while still refusing to be a log-volume amplifier.
  it("rate limits a client and returns a retry hint", async () => {
    const headers = { "x-forwarded-for": "198.51.100.21" }
    for (let index = 0; index < 120; index += 1) {
      const response = await POST(request(violation(), headers))
      expect(response.status).toBe(202)
    }

    const response = await POST(request(violation(), headers))

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("60")
  })

  it("rate limits per client, not globally", async () => {
    const limited = { "x-forwarded-for": "198.51.100.22" }
    for (let index = 0; index < 120; index += 1) {
      await POST(request(violation(), limited))
    }
    expect((await POST(request(violation(), limited))).status).toBe(429)

    // A second client is unaffected — otherwise one noisy page would blind the
    // whole deployment to violations everywhere else.
    const other = { "x-forwarded-for": "198.51.100.23" }
    expect((await POST(request(violation(), other))).status).toBe(202)
  })

  it("accepts an empty body without throwing", async () => {
    // sendBeacon and some agents can deliver a zero-length report; answering 400
    // is fine, crashing is not.
    const empty = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "Content-Type": REPORT_TO_CONTENT_TYPE },
    })

    const response = await POST(empty)

    expect(response.status).toBe(400)
  })
})
