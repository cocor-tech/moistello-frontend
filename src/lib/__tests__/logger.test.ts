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
