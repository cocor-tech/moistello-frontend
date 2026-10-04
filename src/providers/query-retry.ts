/**
 * Rate-limit-aware retry policy for TanStack Query.
 *
 * Problem: the default policy is `retry: 1`, so a 429 is retried almost
 * immediately. Under sustained throttling that produces a retry storm — each
 * retry re-triggers the limiter, which answers 429 again, and the client keeps
 * hammering the endpoint it is already being told to back off from.
 *
 * Policy implemented here:
 * - `Retry-After` (seconds OR HTTP-date) is honoured exactly when the server
 *   sends it, which is the only delay the server actually told us to use. It
 *   is never capped down: retrying earlier than instructed is the very
 *   throttling we are trying to avoid.
 * - Otherwise fall back to exponential backoff: base * 2^(attempt-1), clamped
 *   to a cap and jittered so clients do not resynchronise into a thundering herd.
 * - Retries are bounded, so a permanently throttled query eventually surfaces
 *   the error to the user instead of spinning forever.
 *
 * Kept in its own module (not inside the provider) so the delay maths can be
 * unit-tested without mounting React or a QueryClient.
 */

/** First backoff delay when the server gives us no `Retry-After`. */
export const RETRY_BASE_DELAY_MS = 1_000

/** Hard ceiling on the *exponential* backoff delay. Does not cap Retry-After. */
export const RETRY_MAX_DELAY_MS = 60_000

/** Never retry faster than this, even if a server asks for `Retry-After: 0`. */
export const RETRY_MIN_DELAY_MS = 1_000

/** Maximum number of retries for a rate-limited query. */
export const RATE_LIMIT_MAX_RETRIES = 5

export interface BackoffOptions {
  baseDelayMs?: number
  maxDelayMs?: number
  minDelayMs?: number
  maxRetries?: number
  /** Fractional jitter applied to each delay (0 disables jitter). */
  jitterRatio?: number
}

interface NormalizedOptions {
  baseDelayMs: number
  maxDelayMs: number
  minDelayMs: number
  maxRetries: number
  jitterRatio: number
}

function normalize(options: BackoffOptions = {}): NormalizedOptions {
  const maxDelayMs = options.maxDelayMs ?? RETRY_MAX_DELAY_MS
  return {
    baseDelayMs: options.baseDelayMs ?? RETRY_BASE_DELAY_MS,
    maxDelayMs,
    // A min above the cap would make clamping ambiguous, so keep min <= cap.
    minDelayMs: Math.min(options.minDelayMs ?? RETRY_MIN_DELAY_MS, maxDelayMs),
    maxRetries: options.maxRetries ?? RATE_LIMIT_MAX_RETRIES,
    jitterRatio: options.jitterRatio ?? 0.2,
  }
}

function clamp(ms: number, min: number, max: number): number {
  return Math.min(Math.max(ms, min), max)
}

/**
 * Applies +/- jitter to spread retries across clients.
 *
 * Jitter is subtracted from the cap as well, so a jittered delay can never
 * exceed the cap and a Retry-After value is honoured to within the configured
 * tolerance.
 */
function applyJitter(ms: number, ratio: number, random: () => number): number {
  if (ratio <= 0) return ms
  const jitter = ms * ratio * (random() * 2 - 1)
  return Math.max(0, Math.round(ms + jitter))
}


/** Reads a header value from an Axios error, a Fetch Response, or undefined. */
function readHeader(error: unknown, name: string): string | null {
  const lower = name.toLowerCase()
  const headers = (
    error as { response?: { headers?: unknown }; headers?: unknown } | null
  )?.response?.headers ?? (error as { headers?: unknown } | null)?.headers

  if (!headers) return null

  // AxiosHeaders exposes .get(); plain objects do not.
  const maybeGetter = (headers as { get?: unknown }).get
  if (typeof maybeGetter === "function") {
    const value = (maybeGetter as (k: string) => unknown).call(headers, lower)
    return typeof value === "string" ? value : null
  }

  const record = headers as Record<string, unknown>
  const key = Object.keys(record).find((k) => k.toLowerCase() === lower)
  if (!key) return null
  const value = record[key]
  if (typeof value === "string") return value
  if (Array.isArray(value) && typeof value[0] === "string") return value[0]
  return null
}

/** Extracts the HTTP status from an Axios/Fetch error, if present. */
export function getStatusCode(error: unknown): number | undefined {
  const status = (
    error as { response?: { status?: number }; status?: number } | null
  )?.response?.status ?? (error as { status?: number } | null)?.status
  return typeof status === "number" ? status : undefined
}

/**
 * Parses a `Retry-After` header into milliseconds.
 *
 * Supports both forms defined by RFC 9110:
 * - delta-seconds: "120"
 * - HTTP-date: "Wed, 21 Oct 2015 07:28:00 GMT"
 *
 * Returns null when the header is absent or unparseable, so the caller can
 * fall back to exponential backoff.
 */
export function parseRetryAfterMs(
  error: unknown,
  now: number = Date.now(),
): number | null {
  const raw = readHeader(error, "retry-after")?.trim()
  if (!raw) return null

  const seconds = Number(raw)
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000)
  }

  const asDate = Date.parse(raw)
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - now)
  }

  return null
}

/**
 * Computes the delay before retry `attemptNumber` (1-based) for `error`.
 *
 * Returns null when the failure is not a rate limit, letting TanStack Query
 * apply its normal retry behaviour for other errors.
 */
export function resolveRetryDelayMs(
  error: unknown,
  attemptNumber: number,
  options: BackoffOptions = {},
  random: () => number = Math.random,
  now: number = Date.now(),
): number | null {
  if (getStatusCode(error) !== 429) return null

  const opts = normalize(options)
  const retryAfterMs = parseRetryAfterMs(error, now)

  if (retryAfterMs !== null) {
    // The server told us when it will accept traffic again. Honouring it is
    // the whole point: clamping it down would retry *earlier* than asked,
    // which is exactly the throttling we are trying to avoid. Only the floor
    // applies, and jitter is deliberately not applied either, so the delay
    // stays accurate to the second.
    return Math.max(retryAfterMs, opts.minDelayMs)
  }

  // No server hint: back off exponentially and keep it bounded.
  const exponential = opts.baseDelayMs * 2 ** Math.max(0, attemptNumber - 1)
  const bounded = clamp(exponential, opts.minDelayMs, opts.maxDelayMs)
  const jittered = applyJitter(bounded, opts.jitterRatio, random)

  // Re-clamp so jitter can never push the delay past the cap.
  return clamp(jittered, opts.minDelayMs, opts.maxDelayMs)
}

/**
 * Builds the `retry` callback for QueryClient.
 *
 * Returning `false` stops retrying; returning a number schedules the next
 * attempt that many milliseconds later.
 */
export function createRateLimitAwareRetry(options: BackoffOptions = {}) {
  return function retry(failureCount: number, error: unknown): number | false {
    const opts = normalize(options)

    // Already failed once more than we allow for a rate-limited query.
    if (failureCount > opts.maxRetries) return false

    const delay = resolveRetryDelayMs(error, failureCount + 1, options)
    if (delay === null) {
      // Not a 429. Preserve the previous behaviour of a single retry for
      // transient errors rather than giving up immediately.
      return failureCount < 1
    }

    return delay
  }
}
