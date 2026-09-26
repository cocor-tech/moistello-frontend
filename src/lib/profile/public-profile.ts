/**
 * The public projection of a member profile.
 *
 * This module is the single gate between a full user record and anything an
 * unauthenticated visitor can see. Both the public profile route and the
 * owner's preview render the *same* `PublicProfile` value, which is what makes
 * "the preview hides exactly what the public page hides" true by construction
 * rather than by two code paths happening to agree.
 *
 * The projection is an allow-list: fields are copied in explicitly, so a new
 * private field on the user record is private by default.
 */

export interface PublicProfile {
  handle: string;
  displayName: string;
  bio: string;
  moiScore: number;
  countryCode: string | null;
  createdAt: string;
  avatarIpfsHash: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  /** Already truncated for display; the full address never leaves the server. */
  walletAddressPreview: string | null;
}

/**
 * Never present in a `PublicProfile`. Documented (and asserted in tests) so a
 * future field is added deliberately rather than by accident.
 */
export const PRIVATE_PROFILE_FIELDS = [
  "email",
  "phone",
  "password",
  "passwordHash",
  "sessionTtlMinutes",
  "preferredLanguage",
  "walletAddress",
  "accessToken",
  "refreshToken",
  "hmac",
] as const;

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** `GABC…WXYZ` — enough to recognise an address, not enough to use it. */
export function maskWalletAddress(address: string | null): string | null {
  if (!address || address.length <= 12) return address || null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isValidHandle(handle: unknown): handle is string {
  return typeof handle === "string" && HANDLE_PATTERN.test(handle);
}

/** Derive a URL-safe handle from a display name. */
export function handleFromDisplayName(displayName: string, userId?: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const candidate = base.length >= 3 ? base : `member-${(userId ?? "1").slice(0, 6)}`;
  return isValidHandle(candidate) ? candidate : `member-${(userId ?? "1").slice(0, 6)}`;
}

/**
 * Project an arbitrary user record down to its public shape.
 *
 * `source` is `unknown` on purpose: the auth store's user type is not
 * guaranteed to be present, and this function must not be the thing that
 * breaks when it changes. Only string/number fields that pass the allow-list
 * are read; everything else is discarded without inspection.
 */
export function toPublicProfile(source: unknown, handle: string): PublicProfile | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  if (!isValidHandle(handle)) return null;

  return {
    handle,
    displayName: asString(record.displayName) || "Anonymous member",
    bio: asString(record.bio),
    moiScore: asNumber(record.moiScore),
    countryCode: asOptionalString(record.countryCode),
    createdAt: asString(record.createdAt),
    avatarIpfsHash: asOptionalString(record.avatarIpfsHash),
    twitterUrl: asOptionalString(record.twitterUrl),
    githubUrl: asOptionalString(record.githubUrl),
    walletAddressPreview: maskWalletAddress(asOptionalString(record.walletAddress)),
  };
}

/** True when `field` must never reach an unauthenticated client. */
export function isPrivateProfileField(field: string): boolean {
  return (PRIVATE_PROFILE_FIELDS as readonly string[]).includes(field);
}
