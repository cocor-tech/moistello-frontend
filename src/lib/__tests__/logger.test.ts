import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  flushLogs,
  getBufferedLogCount,
  getConfiguredLogLevel,
  logger,
  parseLogEvents,
  resetLogger,
  sanitizeLogContext,
  setLogLevel,
} from "@/lib/logger"

beforeEach(() => {
  resetLogger()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("structured logger", () => {
  it("filters events below the configured production level", () => {
    setLogLevel("info")
    logger.debug("development detail")
    logger.info("production event")
    expect(getBufferedLogCount()).toBe(1)
  })

  it("never enables debug logging in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    setLogLevel("debug")
    expect(getConfiguredLogLevel()).toBe("info")
  })

  it("aggregates repeated browser events before sending them", () => {
    setLogLevel("info")
    logger.warn("Retryable operation", { operation: "fetch" })
    logger.warn("Retryable operation", { operation: "fetch" })
    expect(getBufferedLogCount()).toBe(1)
  })

  it("redacts secrets, email addresses, and wallet addresses", () => {
    const context = sanitizeLogContext({
      password: "do-not-log",
      email: "person@example.com",
      address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    })

    expect(context).toEqual({
      password: "[redacted]",
      email: "[redacted]",
      address: "[redacted]",
    })
  })

  it("redacts Authorization headers, tokens, and personal fields from strings and context (#496)", () => {
    const context = sanitizeLogContext({
      authorization: "Bearer secret-token-xyz",
      apiKey: "ak_live_1234567890",
      phone: "+1-555-867-5309",
      ssn: "123-45-6789",
      creditCard: "4111-2222-3333-4444",
      firstName: "Alice",
      lastName: "Smith",
      dob: "1990-01-01",
      details: "Request failed with authorization: secret_auth_header, jwt eyJhbGciOi.eyJzdWIiOi.signature and seed SBV472IWJGRK723D4L73K6E3XZ7QJ6C5B32E7Y6U432W1QAZ2WSXEDC",
    })

    expect(context).toEqual({
      authorization: "[redacted]",
      apiKey: "[redacted]",
      phone: "[redacted]",
      ssn: "[redacted]",
      creditCard: "[redacted]",
      firstName: "[redacted]",
      lastName: "[redacted]",
      dob: "[redacted]",
      details: expect.stringMatching(/authorization:\s*\[redacted\]/),
    })
    expect((context as Record<string, string>).details).not.toContain("SBV472IWJGRK723D4L73K6E3XZ7QJ6C5B32E7Y6U432W1QAZ2WSXEDC")
    expect((context as Record<string, string>).details).toContain("[stellar-secret-key]")
    expect((context as Record<string, string>).details).not.toContain("eyJhbGciOi.eyJzdWIiOi.signature")
    expect((context as Record<string, string>).details).toContain("[jwt]")
  })

  it("ensures redaction runs before browser transport sends events (#496)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetchMock)
    setLogLevel("debug")

    logger.error("Failed call to /user?token=secret_abc with Authorization: Bearer sensitive_tok", {
      phone: "555-555-0199",
      card: "4532-1234-5678-9012",
      token: "secret_value",
    })

    flushLogs()

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/logs",
      expect.objectContaining({
        method: "POST",
        body: expect.stringMatching(/Bearer \[redacted\]/),
      }),
    )

    const callBody = fetchMock.mock.calls[0][1]?.body as string
    expect(callBody).not.toContain("sensitive_tok")
    expect(callBody).not.toContain("secret_abc")
    expect(callBody).not.toContain("secret_value")
    expect(callBody).not.toContain("555-555-0199")
    expect(callBody).not.toContain("4532-1234-5678-9012")
  })

  it("batches browser events to the log endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetchMock)
    setLogLevel("debug")

    for (let index = 0; index < 25; index += 1) logger.info(`event-${index}`)
    expect(getBufferedLogCount()).toBe(0)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/logs",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("rejects malformed log payloads at the ingestion boundary", () => {
    expect(parseLogEvents({ level: "verbose", message: "not a level" })).toEqual([])
    expect(parseLogEvents({ level: "info", message: "valid", context: { token: "secret" } })).toEqual([
      expect.objectContaining({ level: "info", message: "valid", context: { token: "[redacted]" } }),
    ])
  })

  it("serializes bigint context values without throwing", () => {
    expect(sanitizeLogContext({ requestId: BigInt(42) })).toEqual({ requestId: "42" })
  })

  it("keeps distinct context values in separate aggregated events", () => {
    setLogLevel("info")
    logger.info("cache lookup", { key: "first" })
    logger.info("cache lookup", { key: "second" })
    expect(getBufferedLogCount()).toBe(2)
  })

  it("aggregates equivalent context regardless of key order", () => {
    setLogLevel("info")
    logger.info("ordered event", { first: 1, second: 2 })
    logger.info("ordered event", { second: 2, first: 1 })
    expect(getBufferedLogCount()).toBe(1)
  })

  it("caps oversized redacted context values", () => {
    expect(sanitizeLogContext({ first: "x".repeat(2_000), second: "y".repeat(2_000) })).toEqual({
      truncated: "[context too large]",
    })
  })

  it("requeues a batch when the browser transport rejects it", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"))
    vi.stubGlobal("fetch", fetchMock)
    setLogLevel("info")
    logger.warn("offline operation")
    flushLogs()

    await vi.waitFor(() => expect(getBufferedLogCount()).toBe(1))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/logs",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("drops permanent client-error responses instead of retrying forever", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 400 }))
    vi.stubGlobal("fetch", fetchMock)
    setLogLevel("info")
    logger.warn("invalid log")
    flushLogs()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(getBufferedLogCount()).toBe(0)
  })
})
