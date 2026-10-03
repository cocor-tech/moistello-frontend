/**
 * Idempotency keys for the two-phase page upload.
 *
 * A retry is not a new upload. When phase 1 fails in a way that hides whether
 * the server ever saw the bytes (dropped response, timeout, tab closed mid
 * request), the only safe move on retry is to re-send the *same* intent and let
 * the server collapse duplicates. That intent is named by a key the client
 * generates once per file: same key -> one staged record, whatever the number
 * of attempts.
 *
 * The key is deliberately client-generated. The server cannot tell "the user
 * pressed retry" from "the user uploaded the same file again", so only the
 * client knows when an upload is genuinely new — and the key is regenerated
 * exactly then.
 *
 * Shared by both sides on purpose: the same module that produces the key also
 * defines the shape the server accepts, so the two can never drift.
 */

/** Request header carrying the key. Lower-case: HTTP headers are not case sensitive. */
export const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key"

/**
 * Keys are opaque to the server but are stored next to staged bytes, so the
 * shape is restricted to characters that cannot escape the staging directory
 * and to a length that cannot be used to blow up a filename.
 */
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && IDEMPOTENCY_KEY_PATTERN.test(value);
}

/**
 * A fresh key for a genuinely new upload.
 *
 * `crypto.randomUUID` is the primary source; the fallback exists for
 * non-secure contexts and older runtimes, where this still only needs to be
 * unique, never unguessable — the server treats the key as an opaque
 * correlation id, not a credential.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Identity of an upload *intent*: which file the user is trying to upload.
 *
 * Two `File` handles on the same file on disk have different object identities
 * but the same name, size and mtime — which is what lets a re-picked file keep
 * its key while a different file gets a new one. An edited file re-picked under
 * the same name counts as a new upload, because its mtime moved.
 *
 * The signature is deliberately cheap enough to compute on every attempt; the
 * cost of two files agreeing on all three fields while an earlier upload of the
 * same name is still unresolved is one upload being reported as a retry of
 * itself, which the server collapses rather than duplicates.
 */
export function getUploadIntentSignature(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
