import { formatDistanceToNow } from "date-fns"
import type { Locale } from "date-fns"

/**
 * Default locale used when a caller doesn't pass one explicitly. Kept as
 * `en-US` so existing call sites render identically until they opt in to the
 * active locale (see {@link useIntl}).
 */
export const DEFAULT_LOCALE = "en-US"

/**
 * Format a numeric amount for a given locale. `locale` is threaded to
 * `Intl` so grouping separators, currency placement and decimal separators
 * follow the active language rather than being pinned to `en-US`. Falls back
 * to the {@link DEFAULT_LOCALE}.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = DEFAULT_LOCALE
): string {
  // XLM (and anything without a real fiat quote) renders as "0.1234 XLM".
  // Everything else renders as a localized currency amount. The currency code
  // is still passed so parity-sensitive callers can rely on the shape.
  if (currency === "XLM") {
    return `${amount.toLocaleString(locale, { maximumFractionDigits: 4 })} XLM`
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amount)
}

/**
 * Format a date for a given locale. Localization covers weekday/month/year
 * names, order of fields and the date separator.
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE
): string {
  const d = typeof date === "string" ? new Date(date) : date

  const defaults: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }

  return new Intl.DateTimeFormat(locale, { ...defaults, ...options }).format(d)
}

const isInvalidDate = (d: Date) => Number.isNaN(d.getTime())

/**
 * Relative time (e.g. "2 hours ago") in the given date-fns `Locale`.
 * Date-fns localizes each supported language through its own Locale objects,
 * so `locale` is a date-fns `Locale` here (not the BCP-47 tag). Falls back to
 * a localized absolute date when the relative calculation fails.
 */
export function formatRelativeTime(
  date: string | Date,
  locale?: Locale
): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (isInvalidDate(d)) return ""

  try {
    return formatDistanceToNow(d, {
      addSuffix: true,
      ...(locale ? { locale } : {}),
    })
  } catch {
    return formatDate(d)
  }
}

export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Locale-aware integer grouping. `locale` is optional and defaults to
 * {@link DEFAULT_LOCALE} for callers that don't have the active tag handy.
 */
export function formatNumber(
  num: number,
  locale: string = DEFAULT_LOCALE
): string {
  return num.toLocaleString(locale)
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) {
    return `${days}d`
  }
  return `${days}d ${remainingHours}h`
}

export const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;