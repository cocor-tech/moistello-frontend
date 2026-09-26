// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest"

import { parseCspReport } from "../csp-report"

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger")
  return { ...actual, logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }
})

/** The legacy `report-uri` shape: the CSP body posted at the top level. */
function legacyReport(overrides: Record<string, unknown> = {}) {
  return {
    "document-uri": "https://moistello.com/wallet",
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://cdn.attacker.example/tracker.js",
    "source-file": "https://moistello.com/_next/static/chunks/webpack.js",
    "status-code": 200,
    type: "csp-violation",
    ...overrides,
  }
}

/** The Reporting API shape used by `report-to`: same body, wrapped and camelCased. */
function reportingApiReport(overrides: Record<string, unknown> = {}) {
  return {
    age: 0,
    type: "csp-violation",
    url: "https://moistello.com/",
    body: {
      documentURL: "https://moistello.com/circles",
      effectiveDirective: "script-src",
      violatedDirective: "script-src",
      blockedURL: "inline",
      disposition: "report",
      sourceFile: "https://moistello.com/_next/static/chunks/main.js",
      statusCode: 200,
      ...overrides,
    },
  }
}

describe("parseCspReport", () => {
  it("accepts the legacy report-uri shape", () => {
    const reports = parseCspReport(legacyReport())

    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({
      type: "csp-violation",
      directive: "script-src-elem",
      blockedUri: "https://cdn.attacker.example/tracker.js",
      documentUri: "https://moistello.com/wallet",
      statusCode: 200,
    })
  })

  it("accepts the Reporting API shape used by report-to", () => {
    const reports = parseCspReport(reportingApiReport())

    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({
      directive: "script-src",
      blockedUri: "inline",
      documentUri: "https://moistello.com/circles",
      // The field that distinguishes an observed policy from an enforced one.
      disposition: "report",
    })
  })

  it("preserves the disposition so enforce and report are distinguishable", () => {
    const reported = parseCspReport(reportingApiReport({ disposition: "report" }))
    const enforced = parseCspReport(reportingApiReport({ disposition: "enforce" }))

    expect(reported[0].disposition).toBe("report")
    expect(enforced[0].disposition).toBe("enforce")
  })

  it("accepts a batch array", () => {
    expect(parseCspReport([legacyReport(), reportingApiReport()])).toHaveLength(2)
  })

  // Everything below is the hostile-input surface. A violation report is an
  // ordinary POST anyone can craft, so nothing in the body is trustworthy.
  it("rejects a non-CSP report type", () => {
    expect(parseCspReport(reportingApiReport({ type: "deprecation" }))).toEqual([])
  })

  it("rejects a body with neither a blocked resource nor a directive", () => {
    // Nothing actionable; logging it would just be noise.
    expect(parseCspReport(legacyReport({ "blocked-uri": "", "violated-directive": "" }))).toEqual([])
  })

  it.each([
    ["a string", "not-an-object"],
    ["null", null],
    ["a number", 42],
    ["an empty object", {}],
  ])("rejects %s", (_label, value) => {
    expect(parseCspReport(value)).toEqual([])
  })

  it("drops a malformed entry but keeps the valid ones in the batch", () => {
    const reports = parseCspReport([legacyReport(), { type: "nonsense" }, reportingApiReport()])

    expect(reports).toHaveLength(2)
  })

  it("truncates attacker-controlled URI fields", () => {
    const huge = `https://evil.example/${"a".repeat(50_000)}`
    const reports = parseCspReport(legacyReport({ "blocked-uri": huge }))

    // Without the cap a single violation becomes a multi-megabyte log line.
    expect(reports[0].blockedUri.length).toBe(512)
  })

  it("truncates a long directive name", () => {
    const reports = parseCspReport(legacyReport({ "violated-directive": "x".repeat(1_000) }))

    expect(reports[0].directive.length).toBe(128)
  })

  it("refuses an oversized batch outright", () => {
    const batch = Array.from({ length: 100 }, () => legacyReport())

    expect(parseCspReport(batch)).toEqual([])
  })

  it("coerces non-numeric line and status values to zero", () => {
    const reports = parseCspReport(legacyReport({
      "status-code": "200",
      "line-number": "12",
    }))

    // No NaN reaching a log field, where it would serialise as null anyway.
    expect(reports[0].statusCode).toBe(0)
    expect(reports[0].lineNumber).toBe(0)
  })

  it("ignores prototype-polluting keys in the body", () => {
    const reports = parseCspReport(JSON.parse(
      `{"type":"csp-violation","violated-directive":"script-src","blocked-uri":"inline","__proto__":{"polluted":true}}`,
    ))

    expect(reports).toHaveLength(1)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
