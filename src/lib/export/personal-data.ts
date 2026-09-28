import type { Contribution } from "@/types"

/**
 * Personal data export (#472).
 *
 * A user asking to take their data elsewhere gets a single JSON document with
 * their profile, contributions and notifications. Building it here — as a pure
 * function with no I/O — is what makes "reflects the requesting user only"
 * testable: the route's only job is to establish *who* is asking, and this
 * module's job is to guarantee nothing else ends up in the file.
 */

/** Bumped when the document shape changes, so an old export stays interpretable. */
export const EXPORT_SCHEMA_VERSION = 1

export interface ExportProfile {
  id: string
  username?: string | null
  email?: string | null
  displayName?: string | null
  walletAddress?: string | null
  createdAt?: string | null
  preferredLanguage?: string | null
  countryCode?: string | null
}

export interface ExportNotification {
  id: string
  userId: string
  type?: string
  title?: string | null
  body?: string | null
  read?: boolean
  createdAt?: string | null
}

export interface PersonalDataArchive {
  schemaVersion: number
  generatedAt: string
  /** Whose data this is. Present so the file is self-identifying. */
  subject: { userId: string }
  profile: ExportProfile
  contributions: Contribution[]
  notifications: ExportNotification[]
  /** Plain counts, so a consumer can sanity-check the file without parsing it. */
  counts: {
    contributions: number
    notifications: number
  }
}

export interface ArchiveInput {
  user: ExportProfile
  contributions: readonly Contribution[]
  notifications: readonly ExportNotification[]
  generatedAt?: Date
}

/**
 * Keeps only records belonging to `userId`.
 *
 * Applied on the server to every collection regardless of what the upstream
 * query returned. Defence in depth: a backend that ignores a `userId` filter, or
 * a future caller that forgets it, still cannot leak another user's data —
 * which is the whole acceptance criterion, so it is enforced here rather than
 * trusted upstream.
 *
 * A record with no `userId` is dropped rather than kept, because "I cannot
 * prove this is yours" must not resolve to "include it".
 */
export function filterByUser<T extends { userId?: string | null }>(
  records: readonly T[],
  userId: string,
): T[] {
  if (!Array.isArray(records)) return []
  return records.filter((record) => record?.userId === userId)
}

export function buildPersonalDataArchive(input: ArchiveInput): PersonalDataArchive {
  const generatedAt = (input.generatedAt ?? new Date()).toISOString()
  const userId = input.user.id

  const contributions = filterByUser(input.contributions, userId)
  const notifications = filterByUser(input.notifications, userId)

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    generatedAt,
    subject: { userId },
    profile: { ...input.user },
    contributions,
    notifications,
    counts: {
      contributions: contributions.length,
      notifications: notifications.length,
    },
  }
}

/**
 * `Content-Disposition` filename.
 *
 * The user id is included so someone exporting from two accounts can tell the
 * files apart, and the date is ISO-derived so the name is stable and sortable.
 * Sanitised because the value lands in a response header.
 */
export function toArchiveFilename(userId: string, generatedAt: Date = new Date()): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "user"
  const day = generatedAt.toISOString().slice(0, 10)
  return `moistello-data-${safeId}-${day}.json`
}

/**
 * Strips fields that should never appear in a portable file.
 *
 * Session tokens and password material are the obvious risk. A user already
 * knows their own password, but a session token in a downloaded file is a
 * live credential, and a data export is the most likely file on a machine to be
 * forwarded or synced somewhere.
 */
const REDACTED_KEYS = [
  "password",
  "passwordHash",
  "sessionToken",
  "accessToken",
  "refreshToken",
  "token",
  "secret",
  "privateKey",
  "mnemonic",
  "seed",
]

/** Deep-clones a value with sensitive keys replaced by `"[redacted]"`. */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redact(item)) as unknown as T
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.includes(key) ? "[redacted]" : redact(entry)
    }
    return out as T
  }
  return value
}
