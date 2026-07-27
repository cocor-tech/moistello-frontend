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
    ...toOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN),
  ]
}

/** Generate a fresh, unpredictable nonce for a single response. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV !== "production"): string {
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
  ]

  return directives
    .map((directive) => (directive.length === 1 ? directive[0] : `${directive[0]} ${directive[1].join(" ")}`))
    .join("; ")
}
