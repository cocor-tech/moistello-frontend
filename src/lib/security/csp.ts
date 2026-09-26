/**
 * Content-Security-Policy construction.
 *
 * The root layout renders four inline <script> blocks (theme flasher, two
 * JSON-LD blocks, the Yandex Metrika loader), so the policy is built per
 * request around a fresh nonce that middleware also hands to the layout.
 *
 * 'strict-dynamic' allows scripts loaded *by* an already-trusted script to
 * run. That covers Next.js chunk loading as well as the hCaptcha and
 * Turnstile widgets, which inject their own <script src> at runtime. The
 * explicit host list that follows is a fallback for browsers without
 * 'strict-dynamic' support — those browsers ignore the keyword and fall back
 * to the allowlist instead.
 *
 * ## Report-only mode
 *
 * A tightened policy is untestable in production: flip one source list and a
 * third-party script silently stops executing, with nothing but a blank widget
 * to show for it. `CSP_REPORT_ONLY` lets a deployment ship the candidate policy
 * under `Content-Security-Policy-Report-Only` so violations are *collected* at
 * /api/csp-report instead of enforced. Same policy string, different header,
 * zero runtime risk — which is the only way to see whether a change breaks the
 * app before it breaks the app.
 *
 * The flag is read at request time (not baked in at build), so promoting a
 * validated candidate to enforcement is a redeploy, not a code change. See
 * cspMode() below and the middleware that consumes it.
 */

const STELLAR_ENDPOINTS = [
  "https://horizon.stellar.org",
  "https://horizon-testnet.stellar.org",
  "https://soroban.stellar.org",
  "https://soroban-testnet.stellar.org",
]

const WALLETCONNECT_ENDPOINTS = [
  "https://*.walletconnect.com",
  "https://*.walletconnect.org",
  "wss://*.walletconnect.com",
  "wss://*.walletconnect.org",
]

const CAPTCHA_HOSTS = ["https://*.hcaptcha.com", "https://challenges.cloudflare.com"]

const ANALYTICS_HOSTS = ["https://mc.yandex.ru", "https://mc.yandex.com"]

/**
 * Where the browser POSTs violation reports, and the Reporting-Endpoints group
 * name it is published under.
 *
 * `report-uri` is the original directive and is what Chrome and Safari honour
 * today; `report-to` is the Reporting API successor and is what Firefox honours.
 * Both are emitted so a violation is collected regardless of engine.
 *
 * The values live in csp-report-paths.mjs because next.config.mjs publishes the
 * same group in a `Reporting-Endpoints` header and must agree exactly; a
 * `report-to` group with no matching header is silently dropped, so the two
 * sites cannot each own their own copy.
 */
import { CSP_REPORT_PATH, CSP_REPORTING_GROUP } from "@/lib/security/csp-report-paths.mjs"

export { CSP_REPORT_PATH, CSP_REPORTING_GROUP }

/**
 * Whether the page policy is enforced or merely observed.
 *
 * Read from the environment on every call rather than captured in a module
 * constant, so a test (or a runtime toggle) can flip modes without reloading
 * the module graph.
 *
 * Fail-closed by design: anything that is not an explicit affirmative — unset,
 * empty, "false", "0", or a typo like "ture" — means enforce. A misconfigured
 * staging box must never silently degrade into not enforcing at all, and a
 * misspelling must not silently deploy a report-only policy to production
 * believing it is protected.
 */
export type CspMode = "enforce" | "report-only"

const REPORT_ONLY_TRUE_VALUES = new Set(["1", "true", "yes", "on", "report-only"])

export function cspMode(): CspMode {
  const raw = process.env.CSP_REPORT_ONLY?.trim().toLowerCase()
  return raw && REPORT_ONLY_TRUE_VALUES.has(raw) ? "report-only" : "enforce"
}

/**
 * Reduce a configured URL to a bare origin so it can be used as a CSP source.
 * Unset or malformed values contribute nothing rather than widening the policy.
 */
function toOrigin(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    return [new URL(raw).origin]
  } catch {
    return []
  }
}

/** Deployment-configured origins the browser is expected to talk to. */
function configuredOrigins(): string[] {
  return [
    ...toOrigin(process.env.NEXT_PUBLIC_API_URL),
    ...toOrigin(process.env.NEXT_PUBLIC_WS_URL),
    ...toOrigin(process.env.NEXT_PUBLIC_METRICS_ENDPOINT),
    ...toOrigin(process.env.NEXT_PUBLIC_LOGS_ENDPOINT),
    ...toOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN),
  ]
}

/** Generate a fresh, unpredictable nonce for a single response. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

export function buildCsp(
  nonce: string,
  isDev = process.env.NODE_ENV !== "production",
  mode: CspMode = cspMode(),
): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Stellar SDK ships WebAssembly; this permits compilation without
    // unlocking JavaScript eval().
    "'wasm-unsafe-eval'",
    // Fallback allowlist for browsers that ignore 'strict-dynamic'.
    ...CAPTCHA_HOSTS,
    ...ANALYTICS_HOSTS,
    // Next.js dev server and React Fast Refresh evaluate bundled code.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ]

  const connectSrc = [
    "'self'",
    ...configuredOrigins(),
    ...STELLAR_ENDPOINTS,
    ...WALLETCONNECT_ENDPOINTS,
    ...CAPTCHA_HOSTS,
    ...ANALYTICS_HOSTS,
    // HMR websocket.
    ...(isDev ? ["ws:"] : []),
  ]

  const directives: Array<[string, string[]] | [string]> = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSrc],
    // React writes component styles as style attributes, and next/font emits
    // an inline <style> block; neither can carry a nonce.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connectSrc],
    ["frame-src", ["'self'", ...CAPTCHA_HOSTS, ...ANALYTICS_HOSTS, "https://verify.walletconnect.com", "https://verify.walletconnect.org"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ...(isDev ? [] : [["upgrade-insecure-requests"] as [string]]),
    // Reporting only makes sense while validating: a report-only policy that
    // reported nothing would be a silent no-op, and an enforcing policy that
    // reports is a bonus rather than the point. So the directives are emitted
    // exactly when the mode flips, which also keeps the enforcing policy string
    // byte-identical to what shipped before reporting existed.
    ...(mode === "report-only"
      ? ([
          ["report-uri", [CSP_REPORT_PATH]],
          ["report-to", [CSP_REPORTING_GROUP]],
        ] as Array<[string, string[]]>)
      : []),
  ]

  return directives
    .map((directive) => (directive.length === 1 ? directive[0] : `${directive[0]} ${directive[1].join(" ")}`))
    .join("; ")
}
