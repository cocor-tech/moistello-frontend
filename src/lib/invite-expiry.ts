/**
 * Invite expiry arithmetic.
 *
 * Pure and dependency-free so the countdown shown to the creator and the
 * "this link has expired" decision shown to a recipient are derived from one
 * implementation. A recipient must never be told a link is valid when it is
 * not, so the expired check is deliberately separate from the formatting and
 * defaults to *expired* when it cannot tell.
 */

/** Milliseconds remaining until `expiresAt`, floored at 0. */
export function msUntilExpiry(expiresAt: string | null, now: number = Date.now()): number {
  if (!expiresAt) return 0
  const target = new Date(expiresAt).getTime()
  if (Number.isNaN(target)) return 0
  return Math.max(0, target - now)
}

/**
 * Whether an invite has expired.
 *
 * An invite with **no** expiry is treated as never expiring, which is the
 * documented meaning of the optional field. An unparseable `expiresAt` is
 * treated as expired: failing closed is the right direction for access control.
 */
export function isInviteExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return false
  const target = new Date(expiresAt).getTime()
  if (Number.isNaN(target)) return true
  return now >= target
}

/** Whether the invite has also used up its allowance. */
export function isInviteExhausted(invite: { useCount: number; maxUses: number }): boolean {
  return invite.useCount >= invite.maxUses
}

export type InviteStatus = "active" | "expired" | "exhausted"

/**
 * Classify an invite. Expiry is checked before exhaustion so a link that is both
 * spent and old is reported as expired — that is the reason a recipient cannot
 * use it, whereas "exhausted" implies someone else consumed it.
 */
export function inviteStatus(
  invite: { expiresAt?: string | null; useCount: number; maxUses: number },
  now: number = Date.now(),
): InviteStatus {
  if (isInviteExpired(invite.expiresAt ?? null, now)) return "expired"
  if (isInviteExhausted(invite)) return "exhausted"
  return "active"
}

/**
 * Human-readable remaining time, e.g. `23h 59m`, `4d 2h`, `Expired`.
 *
 * Drops the leading unit when it is zero (`59m` rather than `0h 59m`) so the
 * countdown stays short as it approaches zero.
 */
export function formatTimeRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "Expired"

  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return "less than a minute"
}

/** Copy shown to a recipient, one message per reason it cannot be used. */
export function describeInviteProblem(status: InviteStatus): string {
  switch (status) {
    case "expired":
      return "This invite link has expired. Ask the circle organiser for a new one."
    case "exhausted":
      return "This invite has already been used the maximum number of times."
    default:
      return "This invite is not available."
  }
}
