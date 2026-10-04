import { formatDistanceToNow } from "date-fns"
import {
  enUS,
  fr,
  de,
  es,
  it,
  ptBR,
  ja,
  ko,
  zhCN,
  zhTW,
  ru,
  ar,
  hi,
  nl,
  pl,
  tr,
  vi,
  th,
  id,
  ms,
  sv,
  da,
  fi,
  nb,
  cs,
  hu,
  ro,
  sk,
  bg,
  hr,
  sr,
  sl,
  et,
  lv,
  lt,
  uk,
  be,
  ka,
  hy,
  az,
  kk,
  uz,
  mn,
} from "date-fns/locale"
import type { Locale } from "date-fns"

/**
 * Default locale used when a caller doesn't pass one explicitly. Kept as
 * `en-US` so existing call sites render identically until they opt in to the
 * active locale (see {@link useIntl}).
 */
export const DEFAULT_LOCALE = "en-US"

const isInvalidDate = (d: Date) => Number.isNaN(d.getTime())

/**
 * Map BCP-47 locale codes to date-fns Locale objects.
 * Falls back to enUS for unsupported locales.
 */
function localeCodeToDateFnsLocale(localeCode: string): Locale {
  const code = localeCode.toLowerCase().split("-")[0]
  const localeMap: Record<string, Locale> = {
    en: enUS,
    fr,
    de,
    es,
    it,
    pt: ptBR,
    ja,
    ko,
    zh: zhCN,
    ru,
    ar,
    hi,
    nl,
    pl,
    tr,
    vi,
    th,
    id,
    ms,
    sv,
    da,
    fi,
    nb,
    cs,
    hu,
    ro,
    sk,
    bg,
    hr,
    sr,
    sl,
    et,
    lv,
    lt,
    uk,
    be,
    ka,
    hy,
    az,
    kk,
    uz,
    mn,
  }
  return localeMap[code] ?? enUS
}

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

/**
 * Date-fns Locale-aware version of formatDate.
 * Accepts a BCP-47 locale code (e.g. "fr", "en-US") and maps it to a
 * date-fns Locale object internally.
 */
export function formatDateLocalized(
  date: string | Date,
  localeCode?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDate(date, options, localeCode ?? DEFAULT_LOCALE)
}

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

/**
 * Relative time with BCP-47 locale code.
 * Accepts a locale code (e.g. "fr", "en-US") and maps it to a date-fns Locale.
 * If the locale is not available, falls back to the default date-fns locale (en-US).
 */
export function formatRelativeTimeLocalized(
  date: string | Date,
  localeCode?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (isInvalidDate(d)) return ""

  const locale = localeCode ? localeCodeToDateFnsLocale(localeCode) : undefined

  try {
    return formatDistanceToNow(d, {
      addSuffix: true,
      ...(locale ? { locale } : {}),
    })
  } catch {
    return formatDateLocalized(d, localeCode)
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