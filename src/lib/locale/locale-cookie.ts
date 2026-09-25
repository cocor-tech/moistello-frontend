/**
 * The locale cookie: the one piece of locale state that outlives a page load.
 *
 * Everything else in the i18n stack is client-side. `LocaleProvider` keeps the
 * active code in React state and the dictionary in a module-level cache; the
 * browser keeps a copy in localStorage. Neither of those is available to the
 * server, so a request that arrives after a login redirect has no way to know
 * which language the user picked — and the server renders `<html lang="en">`
 * plus English copy, which then visibly flips once the client effect runs.
 *
 * This cookie is what closes that gap. `middleware` reads it on every document
 * request and forwards it as `x-locale`, so the root layout can render the
 * right `lang`/`dir` and the right dictionary on the very first paint.
 *
 * Unlike the session cookies in `@/lib/auth/session-cookies`, this one is
 * deliberately readable by script and is written from the client. The session
 * cookies carry credentials, so they are `HttpOnly` and only a route handler
 * ever writes them. A language preference is neither a secret nor a credential:
 * it has to be readable by the blocking bootstrap script in the root layout
 * before React hydrates, and it has to be writable synchronously the instant
 * the user picks a language. A server round trip would make both impossible —
 * a reload immediately after the click would still render the old language.
 * Anyone who can read this cookie can already read the page's language.
 *
 * Edge-safe: imported by middleware, so it must stay free of Node built-ins.
 */

const isProduction = process.env.NODE_ENV === "production"

/** Cookie carrying the visitor's chosen locale, mirrored to `<html lang>`. */
export const LOCALE_COOKIE = "moistello_locale"

/** Locale served when nothing has been chosen yet. */
export const DEFAULT_LOCALE = "en"

/**
 * A year, not the 7 days the session cookies get. A language preference should
 * outlive a long absence — someone who picks French once expects to come back
 * to French, not to be re-interrogated in English a week later.
 */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * `secure` tracks NODE_ENV because a `Secure` cookie is dropped outright over
 * plain http://, which would break local development — the same split the
 * session cookies use. `httpOnly: false` for the reason in the module comment.
 */
export const LOCALE_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const

/**
 * Locales written right-to-left. Kept as a set because `dir` is the one
 * locale-derived attribute the browser cannot infer from `lang`.
 *
 * Limited to languages whose *default* script is RTL per CLDR, so `dir` is
 * right without being told. That deliberately excludes Hausa and Kurdish, whose
 * likely-subtag resolves to Latin — the scripts this app actually serves them
 * in — and which would be laid out backwards if listed here.
 */
const RTL_LOCALES = new Set(["ar", "arc", "dv", "fa", "he", "khw", "ks", "ps", "ur", "yi"])

/**
 * ISO 639-1/639-3 shape, optionally with a region subtag (`pt-BR`). The app
 * offers 184 codes and the server can echo back anything the profile field
 * holds, so the value is validated rather than trusted — it is written straight
 * into `<html lang>` and interpolated into a URL, and neither should ever be
 * able to carry markup or a path traversal.
 *
 * Held as source rather than a RegExp so the inline bootstrap script below can
 * embed the exact same rule; two copies of this pattern would drift.
 */
const LOCALE_PATTERN_SOURCE = "^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$"

const LOCALE_PATTERN = new RegExp(LOCALE_PATTERN_SOURCE)

/**
 * Normalise an untrusted locale code. Returns `null` for anything that is not
 * a well-formed code, so callers can fall back rather than propagating junk.
 */
export function normalizeLocale(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!LOCALE_PATTERN.test(trimmed)) return null
  return trimmed
}

/**
 * Normalise, falling back to {@link DEFAULT_LOCALE} for missing or malformed
 * input. Use this on the server, where a `null` would break the render.
 */
export function resolveLocale(raw: string | null | undefined): string {
  return normalizeLocale(raw) ?? DEFAULT_LOCALE
}

/** Writing direction for a locale. Unknown codes fall back to LTR. */
export function dirForLocale(raw: string | null | undefined): "ltr" | "rtl" {
  const code = normalizeLocale(raw)
  if (!code) return "ltr"
  return RTL_LOCALES.has(code.toLowerCase().split("-")[0]) ? "rtl" : "ltr"
}

/**
 * Read the locale cookie from `document.cookie`. Returns `null` on the server,
 * where `document` does not exist — callers treat that as "not chosen yet"
 * rather than as an error.
 */
export function readLocaleCookie(): string | null {
  if (typeof document === "undefined") return null

  const prefix = `${LOCALE_COOKIE}=`
  for (const part of document.cookie.split(";")) {
    const entry = part.trim()
    if (!entry.startsWith(prefix)) continue
    return normalizeLocale(decodeURIComponent(entry.slice(prefix.length)))
  }
  return null
}

/** Persist a locale choice. No-op on the server, and for malformed codes. */
export function writeLocaleCookie(code: string): void {
  if (typeof document === "undefined") return
  const normalized = normalizeLocale(code)
  if (!normalized) return

  // `httpOnly` is meaningless to document.cookie — the flag only ever restricts
  // script reads — so the shared options object is narrowed to the attributes
  // a client can actually set.
  const attributes = [
    `${LOCALE_COOKIE}=${encodeURIComponent(normalized)}`,
    `max-age=${LOCALE_COOKIE_MAX_AGE}`,
    `path=${LOCALE_COOKIE_OPTIONS.path}`,
    `samesite=${LOCALE_COOKIE_OPTIONS.sameSite}`,
    LOCALE_COOKIE_OPTIONS.secure && "secure",
  ].filter(Boolean)

  document.cookie = attributes.join("; ")
}

/**
 * Read the visitor's explicit choice, cookie first.
 *
 * The cookie is the source of truth. localStorage is consulted only as a
 * fallback, for visitors still carrying a choice made by a build that wrote
 * there and nowhere else — the bootstrap script promotes it on load, and
 * {@link persistLocale} upgrades it for good.
 */
export function readPersistedLocale(): string | null {
  const fromCookie = readLocaleCookie()
  if (fromCookie) return fromCookie

  if (typeof localStorage === "undefined") return null
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_COOKIE))
  } catch {
    // Storage access throws in Safari private mode and wherever cookies are
    // blocked. A missing locale is not worth breaking the page over.
    return null
  }
}

/** Write the choice to both stores, so older builds still see it. */
export function persistLocale(code: string): void {
  const normalized = normalizeLocale(code)
  if (!normalized) return

  writeLocaleCookie(normalized)

  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(LOCALE_COOKIE, normalized)
  } catch {
    // The cookie is the one the server reads; storage is a convenience.
  }
}

/**
 * Blocking script injected into <head> ahead of React.
 *
 * It only has one job: rescue a visitor whose locale lives in localStorage but
 * not yet in the cookie. Earlier builds persisted the choice to localStorage
 * only, and the server could not see it — so those visitors get an English
 * first paint on every document request until something writes the cookie.
 * Promoting the value here means their next navigation is correct on the
 * server, with no flash.
 *
 * When the cookie is already present the server has used it, so there is
 * nothing to correct and the script exits immediately. `lang`/`dir` are only
 * touched in the rescue case; the attributes were already rendered correctly
 * by the server.
 */
export const LOCALE_BOOTSTRAP_SCRIPT = `(function(){try{
var n=${JSON.stringify(LOCALE_COOKIE)};
var c=document.cookie?document.cookie.split(';'):[];
for(var i=0;i<c.length;i++){if(c[i].trim().indexOf(n+'=')===0){return}}
var s=localStorage.getItem(n);
if(!s||!new RegExp(${JSON.stringify(LOCALE_PATTERN_SOURCE)}).test(s)){return}
var a='max-age=${LOCALE_COOKIE_MAX_AGE}; path=${LOCALE_COOKIE_OPTIONS.path}; samesite=${LOCALE_COOKIE_OPTIONS.sameSite}';
if(location.protocol==='https:'){a+='; secure'}
document.cookie=n+'='+encodeURIComponent(s)+'; '+a;
var e=document.documentElement;
e.setAttribute('lang',s);
e.setAttribute('dir',${JSON.stringify([...RTL_LOCALES])}.indexOf(s.toLowerCase().split('-')[0])>=0?'rtl':'ltr');
}catch(e){void e}})()`
