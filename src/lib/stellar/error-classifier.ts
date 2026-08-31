/**
 * Soroban error classification (frontend hook-point).
 *
 * Maps Soroban/Stellar error responses to typed domain errors. The
 * authoritative classifier (Go) lives in pkg/stellar/errors.go in the
 * backend; this mirrors the same codes for client-side handling.
 */

export class SorobanError extends Error {
  code: string
  isRetryable: boolean

  constructor(code: string, message: string, isRetryable: boolean) {
    super(message)
    this.code = code
    this.isRetryable = isRetryable
  }
}

export function classifySorobanError(
  statusCode: number,
  body: string,
): SorobanError {
  const message = body.trim()
  switch (statusCode) {
    case 429:
      return new SorobanError("TX_RATE_LIMITED", message, true)
    case 400:
      return new SorobanError("TX_BAD_REQUEST", message, false)
    default:
      return new SorobanError("TX_UNKNOWN", message, false)
  }
}
