/**
 * Human-readable passkey / WebAuthn error messages.
 *
 * WebAuthn surfaces raw DOMException names that are meaningless to end-users.
 * This module maps every standardised error name to a distinct, actionable
 * message so the UI can present clear guidance and retry affordances.
 */

export type PasskeyErrorKind =
  | "cancelled"
  | "unsupported_device"
  | "security_error"
  | "invalid_state"
  | "not_readable"
  | "constraint"
  | "network"
  | "timeout"
  | "unknown"

export interface PasskeyErrorInfo {
  kind: PasskeyErrorKind
  /** Short user-facing headline (no raw error text). */
  title: string
  /** Longer explanation with an action hint. */
  description: string
  /** Whether the user can meaningfully retry without changing anything. */
  canRetry: boolean
}

const ERROR_MAP: Record<string, PasskeyErrorInfo> = {
  // User dismissed the browser prompt or the OS biometric dialog.
  NotAllowedError: {
    kind: "cancelled",
    title: "Passkey prompt cancelled",
    description:
      "The sign-in prompt was cancelled or timed out. Tap the button again to retry.",
    canRetry: true,
  },
  // The browser or OS does not support WebAuthn at all, or the page is not
  // served over a secure context (HTTPS / localhost).
  SecurityError: {
    kind: "security_error",
    title: "Passkey not available here",
    description:
      "Passkeys require a secure (HTTPS) connection. If you're on an untrusted network, switch to a secure connection and try again.",
    canRetry: false,
  },
  // The authenticator reported that a credential already exists for this
  // relying party (typical during registration when one is already enrolled).
  InvalidStateError: {
    kind: "invalid_state",
    title: "Passkey already registered",
    description:
      "A passkey for this account already exists on this device. Sign in instead of registering a new one.",
    canRetry: false,
  },
  // The credential ID returned by the authenticator was not found in the
  // allowCredentials list supplied during authentication.
  NotReadableError: {
    kind: "not_readable",
    title: "Passkey not found on this device",
    description:
      "We couldn't find a passkey for your account on this device. Try another device, or sign in with a different method.",
    canRetry: false,
  },
  // The authenticator cannot satisfy one of the constraints in the request
  // (e.g., a required resident-key or user-verification level).
  ConstraintError: {
    kind: "constraint",
    title: "Device does not meet requirements",
    description:
      "Your device or authenticator doesn't support the security level required. Try a different device or authentication method.",
    canRetry: false,
  },
  // Network-level failures during the ceremony (rare but possible with
  // hybrid / cross-device flows).
  NetworkError: {
    kind: "network",
    title: "Network error during passkey",
    description:
      "A network error interrupted the passkey flow. Check your connection and try again.",
    canRetry: true,
  },
  // The authenticator did not respond within the allowed timeout window.
  TimeoutError: {
    kind: "timeout",
    title: "Passkey timed out",
    description:
      "The passkey request timed out. Make sure your authenticator is ready and try again.",
    canRetry: true,
  },
  // The browser does not implement the WebAuthn API at all (very old
  // browsers, or certain embedded WebViews).
  NotSupportedError: {
    kind: "unsupported_device",
    title: "Passkeys not supported",
    description:
      "Your browser doesn't support passkeys. Try updating your browser, or use a different sign-in method.",
    canRetry: false,
  },
  // AbortError is thrown when the ceremony is explicitly aborted by the
  // page (e.g., the user navigates away mid-flow).
  AbortError: {
    kind: "cancelled",
    title: "Passkey flow interrupted",
    description:
      "The sign-in process was interrupted. Return to the page and try again.",
    canRetry: true,
  },
}

const FALLBACK: PasskeyErrorInfo = {
  kind: "unknown",
  title: "Passkey error",
  description:
    "Something went wrong with your passkey. Please try again or use a different sign-in method.",
  canRetry: true,
}

/**
 * Classify a WebAuthn / passkey error into a `PasskeyErrorInfo` descriptor.
 *
 * Accepts a raw `Error` or any adapter error object that carries a `code`
 * string.  Only public, safe data is ever returned — raw exception messages
 * are never surfaced to the user.
 */
export function classifyPasskeyError(error: unknown): PasskeyErrorInfo {
  if (error instanceof Error) {
    const info = ERROR_MAP[error.name]
    if (info) return info
  }

  // Passkey adapter errors carry a `code` field like "user_rejected"
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = (error as { code: string }).code
    if (code === "user_rejected") return ERROR_MAP.NotAllowedError
    if (code === "not_supported") return ERROR_MAP.NotSupportedError
  }

  return FALLBACK
}
