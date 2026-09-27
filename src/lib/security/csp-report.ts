/**
 * Validation and emission for Content-Security-Policy violation reports.
 *
 * Kept out of the route handler (mirroring parseLogEvents/writeServerLog in
 * lib/logger) so the trust-boundary rules are unit-testable without spinning up
 * a request.
 *
 * ## Treat every field as hostile
 *
 * A violation report is not a first-party event. `blocked-uri` and `source-file`
 * are strings chosen by whatever page triggered the violation, and the body is an
 * ordinary POST that anyone can craft with curl. Nothing here is interpolated
 * into a header, a query, or a filesystem path — the values only ever reach a
 * structured log line — but they are still capped, so a 2 MB "URI" cannot turn
 * one violation into a multi-megabyte log entry.
 */

import { logger } from "@/lib/logger"

/** Both wire formats are accepted: `report-uri` posts csp-report, `report-to` posts body. */
export interface CspViolationReport {
  /** "csp-violation" for CSP; other Reporting API types are ignored. */
  type: string
  /** The directive that was violated, e.g. "script-src-elem". */
  directive: string
  /** The effective policy, truncated — enough to diff against a candidate. */
  effectiveDirective: string
  /** The blocked resource, or a keyword like 'inline' / 'eval'. */
  blockedUri: string
  documentUri: string
  sourceFile: string
  /** Page line/column when the browser supplies them. */
  lineNumber: number
  columnNumber: number
  statusCode: number
  /** "load" | "script" | "style" | … */
  disposition: string
  receivedAt: number
}

/**
 * Field caps. Generous enough to keep a real report intact (Stellar
 * transaction URLs and WalletConnect hostnames are long), tight enough that a
 * crafted body cannot dominate a log line.
 */
const MAX_URI_LENGTH = 512
const MAX_DIRECTIVE_LENGTH = 128
const MAX_TYPE_LENGTH = 32
const MAX_REPORTS_PER_BODY = 32

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Every spelling each field arrives under.
 *
 * The same value is spelled three different ways depending on which directive
 * the engine honoured, and the differences are not mechanical — "uri" and "url"
 * are different words, so no amount of case transformation derives one from the
 * other:
 *   - `blocked-uri`  — CSP Level 3 `report-uri` JSON body (hyphenated; what
 *                      Chrome and Safari actually send today)
 *   - `blockedURL`   — Reporting API `body` object (camelCase, capitalised URL)
 *   - `blocked_uri`  — observed from some proxies and older agents
 *
 * These names are fixed by the spec, so they are spelled out rather than
 * generated. A missing field yields "" for every accessor, so callers can treat
 * "absent" and "empty" identically.
 */
const FIELD_ALIASES = {
  type: ["type"],
  "violated-directive": ["violated-directive", "violatedDirective", "violated_directive"],
  "effective-directive": ["effective-directive", "effectiveDirective", "effective_directive"],
  "blocked-uri": ["blocked-uri", "blockedURL", "blockedUrl", "blockedUri", "blocked_uri"],
  "document-uri": ["document-uri", "documentURL", "documentUrl", "documentUri", "document_uri"],
  "source-file": ["source-file", "sourceFile", "source_file"],
  "line-number": ["line-number", "lineNumber", "line_number"],
  "column-number": ["column-number", "columnNumber", "column_number"],
  "status-code": ["status-code", "statusCode", "status_code"],
  disposition: ["disposition"],
} as const satisfies Record<string, readonly string[]>

type FieldName = keyof typeof FIELD_ALIASES

function strField(source: Record<string, unknown>, name: FieldName, max = MAX_URI_LENGTH): string {
  for (const key of FIELD_ALIASES[name]) {
    const value = source[key]
    if (typeof value === "string") return value.slice(0, max)
  }
  return ""
}

function numField(source: Record<string, unknown>, name: FieldName): number {
  for (const key of FIELD_ALIASES[name]) {
    const value = source[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return 0
}

/**
 * Pull a report out of one wire entry, or null if it is not a CSP violation.
 *
 * `disposition` is the field that says whether the browser actually blocked the
 * resource ("enforce") or merely reported it ("report"). Keeping it means a
 * report-only deployment is distinguishable from an enforcing one in the logs —
 * which is the whole question a report-only rollout exists to answer.
 */
function parseOne(value: unknown): CspViolationReport | null {
  if (!isRecord(value)) return null

  // The Reporting API wraps the CSP body under `body` and carries `type` at the
  // top level; the legacy `report-uri` format posts everything flat. Accept
  // both so a single collector works regardless of which directive the engine
  // honoured.
  const body = isRecord(value.body) ? value.body : value
  const source: Record<string, unknown> = { ...value, ...body }

  const type = strField(source, "type", MAX_TYPE_LENGTH)
  if (type !== "csp-violation") return null

  const blockedUri = strField(source, "blocked-uri")
  const directive = strField(source, "violated-directive", MAX_DIRECTIVE_LENGTH)
  // A violation with no blocked resource and no directive tells us nothing
  // actionable; treat it as noise rather than logging a blank record.
  if (!blockedUri && !directive) return null

  return {
    type,
    directive,
    effectiveDirective: strField(source, "effective-directive", MAX_DIRECTIVE_LENGTH),
    blockedUri,
    documentUri: strField(source, "document-uri"),
    sourceFile: strField(source, "source-file"),
    lineNumber: numField(source, "line-number"),
    columnNumber: numField(source, "column-number"),
    statusCode: numField(source, "status-code"),
    disposition: strField(source, "disposition", 32),
    // Server receipt time, not a client-supplied one. The report body carries an
    // `age` field that would be equally spoofable, and nothing downstream needs
    // sub-second accuracy on when a violation happened.
    receivedAt: Date.now(),
  }
}

/**
 * Parse a report body into zero or more validated reports.
 *
 * Returns an empty array for anything unrecognised so the route can answer 400
 * without the caller having to distinguish "malformed" from "valid but empty".
 * Both the legacy array form and a single object are accepted.
 */
export function parseCspReport(payload: unknown): CspViolationReport[] {
  const values = Array.isArray(payload) ? payload : [payload]
  if (values.length > MAX_REPORTS_PER_BODY) return []

  const reports: CspViolationReport[] = []
  for (const value of values) {
    const report = parseOne(value)
    if (report) reports.push(report)
  }
  return reports
}

/**
 * Emit a report.
 *
 * `warn` rather than `error`: during report-only validation a violation is
 * expected output, not a fault, and routing it at error level would page
 * whoever owns the Sentry alert. The message is prefixed so a log query can
 * isolate CSP reports from application warnings, and the structured fields are
 * passed as context so they survive as queryable properties rather than being
 * flattened into the message string.
 */
export function writeCspReport(report: CspViolationReport): void {
  logger.warn(
    `[csp] violation directive=${report.directive || "unknown"} blocked=${report.blockedUri || "unknown"}`,
    {
      type: report.type,
      directive: report.directive,
      effectiveDirective: report.effectiveDirective,
      blockedUri: report.blockedUri,
      documentUri: report.documentUri,
      sourceFile: report.sourceFile,
      lineNumber: report.lineNumber,
      columnNumber: report.columnNumber,
      statusCode: report.statusCode,
      disposition: report.disposition,
      receivedAt: report.receivedAt,
    },
  )
}
