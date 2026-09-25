"use client"

import { logger } from "@/lib/logger"
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react"
import { EN_SEED } from "./en-seed"
import { useAuthStore } from "@/stores/auth-store"
import { DEFAULT_LOCALE, dirForLocale, normalizeLocale, persistLocale, readPersistedLocale, resolveLocale } from "./locale-cookie"
import type { TranslationDict } from "./types"

interface LocaleContextType {
  locale: string
  setLocale: (lang: string) => void
  t: (key: string) => string
  /** Locale code that failed to load; English is being served instead. Null when healthy. */
  fallbackLocale: string | null
  /** Re-attempt loading a locale that previously failed. */
  retryLocale: (code: string) => void
  /** Hide the fallback notice until the next failure. */
  dismissFallbackNotice: () => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  fallbackLocale: null,
  retryLocale: () => {},
  dismissFallbackNotice: () => {},
})

const cache: Record<string, TranslationDict> = {}

const MAX_FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function fetchLocaleDict(code: string): Promise<TranslationDict> {
  const res = await fetch(`/locale/${code}.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching /locale/${code}.json`)
  return (await res.json()) as TranslationDict
}

/**
 * Fetch a locale dictionary, retrying with exponential backoff before giving up.
 * Failures are surfaced to the caller so the UI can inform the user instead of
 * silently swapping to English.
 */
export async function loadLocaleWithRetry(code: string): Promise<TranslationDict> {
  let lastError: unknown = new Error(`failed to load locale "${code}"`)
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      return await fetchLocaleDict(code)
    } catch (error) {
      lastError = error
      logger.warn(`[locale] Failed to load "${code}" (attempt ${attempt}/${MAX_FETCH_ATTEMPTS})`, error)
      if (attempt < MAX_FETCH_ATTEMPTS) await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }
  throw lastError
}

export function useTranslate() {
  return useContext(LocaleContext)
}

export function LocaleProvider({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: ReactNode
  /**
   * Locale the server resolved from the cookie, handed down from the root
   * layout. Seeding state from a prop rather than reading storage in an
   * initializer is what keeps the hydrated tree identical to the server's HTML
   * — an initializer would resolve to "en" on the server and to the cookie's
   * value in the browser, and React would report a mismatch on every string.
   */
  initialLocale?: string
  /** Dictionary the server rendered with, so the first paint is already correct. */
  initialDictionary?: TranslationDict
}) {
  const authUser = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [locale, setLocaleState] = useState(() => resolveLocale(initialLocale))
  const [dict, setDict] = useState<TranslationDict>(initialDictionary ?? EN_SEED)
  const [fallbackLocale, setFallbackLocale] = useState<string | null>(null)
  const requestRef = useRef(0)

  const loadLocale = useCallback(async (code: string) => {
    const requestId = ++requestRef.current

    if (cache[code]) {
      setDict(cache[code])
      setFallbackLocale(null)
      return
    }

    try {
      const data = await loadLocaleWithRetry(code)
      if (requestId !== requestRef.current) return
      cache[code] = data
      setDict(data)
      setFallbackLocale(null)
    } catch {
      // Never cache the failure — keep serving English but tell the user about it.
      if (requestId !== requestRef.current) return
      logger.warn(`[locale] Falling back to English; could not load "${code}" after retries`)
      setDict(EN_SEED)
      setFallbackLocale(code)
    }
  }, [])

  /**
   * Which locale to display.
   *
   * An explicit local choice outranks the server profile, and that ordering is
   * the whole point: someone who picked a language on a public page has, by the
   * time they sign in, a profile whose `preferredLanguage` is still the default.
   * Preferring the profile would throw their choice away at exactly the moment
   * auth completes — the "logging in resets my language" bug.
   *
   * `initialLocale` sits below the profile on purpose. The profile only exists
   * once `/auth/me` resolves, so on a device with no cookie yet the server's
   * answer is the only one available and has to be honoured — otherwise the
   * provider would drop to English while still displaying the dictionary the
   * server sent, leaving the page claiming one language and reading in another.
   * It also keeps a second device honest: no cookie here, profile says "fr", and
   * the server can only have rendered English.
   */
  const resolveActiveLocale = useCallback((): string => {
    const stored = readPersistedLocale()
    if (stored) return stored
    if (isAuthenticated && authUser?.preferredLanguage) {
      return resolveLocale(authUser.preferredLanguage)
    }
    return resolveLocale(initialLocale)
  }, [isAuthenticated, authUser?.preferredLanguage, initialLocale])

  // Adopt the resolved locale, loading its dictionary only when the server
  // could not already supply one. Re-runs as auth resolves, which is exactly
  // the redirect the locale has to survive.
  useEffect(() => {
    const code = resolveActiveLocale()

    setLocaleState((current) => (current === code ? current : code))

    // The server already rendered `code` with a dictionary it shipped down in
    // initialDictionary, so re-fetching it would be a redundant round trip for a
    // value already on screen.
    if (code === resolveLocale(initialLocale)) return

    void loadLocale(code)
  }, [resolveActiveLocale, loadLocale, initialLocale])

  // Keep the document in step with the active locale. The server set these from
  // the cookie, so this only has work to do after a client-side switch — where
  // nothing else would flip `dir` for an RTL language until the next navigation.
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("lang", locale)
    root.setAttribute("dir", dirForLocale(locale))
  }, [locale])

  /**
   * Teach the server about the current locale.
   *
   * Runs when a language is chosen while signed in, and — the case that
   * motivates it — when auth resolves for someone who chose while signed out,
   * whose profile still carries the default. Without this the choice would
   * render correctly forever on this device and vanish on the next one.
   */
  const syncPreferenceToProfile = useCallback(
    async (code: string) => {
      const state = useAuthStore.getState()
      if (!state.isAuthenticated || !state.user) return
      if (state.user.preferredLanguage === code) return

      try {
        const { patch } = await import("@/lib/api-client")
        await patch("/users/me", { preferredLanguage: code })
        // Re-read rather than writing back the copy captured above: the profile
        // may have been refreshed while the request was in flight, and echoing
        // the stale object would silently revert those fields.
        const latest = useAuthStore.getState()
        if (latest.user) latest.updateUser({ ...latest.user, preferredLanguage: code })
      } catch (e) {
        // Local rendering and the cookie are already correct; only the
        // cross-device copy failed, which is not worth interrupting anyone over.
        logger.warn("[locale] Failed to persist language preference:", e)
      }
    },
    [],
  )

  // Adopt a pre-auth choice once the profile is known. Keyed on the profile's
  // language so it fires once per value rather than on every auth re-check, and
  // skipped entirely when the two already agree.
  const profileLanguage = isAuthenticated ? resolveLocale(authUser?.preferredLanguage) : null
  useEffect(() => {
    if (profileLanguage === null) return
    const local = readPersistedLocale()
    if (!local || local === profileLanguage) return

    void syncPreferenceToProfile(local)
  }, [profileLanguage, syncPreferenceToProfile])

  const setLocale = useCallback(
    (lang: string) => {
      const code = normalizeLocale(lang)
      if (!code) {
        logger.warn(`[locale] Ignoring unsupported locale "${lang}"`)
        return
      }

      setLocaleState(code)
      // Written before the dictionary fetch so the very next document request —
      // including the one the login redirect triggers — is already correct.
      persistLocale(code)
      void loadLocale(code)
      void syncPreferenceToProfile(code)
    },
    [loadLocale, syncPreferenceToProfile],
  )

  const retryLocale = useCallback(
    (code: string) => {
      void loadLocale(code)
    },
    [loadLocale],
  )

  const dismissFallbackNotice = useCallback(() => setFallbackLocale(null), [])

  const t = useCallback(
    (key: string): string => {
      if (dict && key in dict) return dict[key]
      return EN_SEED[key] ?? key
    },
    [dict],
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, fallbackLocale, retryLocale, dismissFallbackNotice }}>
      {children}
      {fallbackLocale && (
        <div
          role="alert"
          data-testid="locale-fallback-banner"
          className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-t-4 border-t-amber-400 bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
        >
          <p className="m-0">
            Couldn&apos;t load translations for <span className="font-mono font-semibold">{fallbackLocale}</span>.
            Showing English instead.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => retryLocale(fallbackLocale)}
              className="rounded-md border border-amber-400/60 px-3 py-1 font-medium text-foreground hover:bg-accent"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={dismissFallbackNotice}
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </LocaleContext.Provider>
  )
}
