"use client"

import { logger } from "@/lib/logger"
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react"
import { EN_SEED } from "./en-seed"
import { useAuthStore } from "@/stores/auth-store"

type TranslationDict = Record<string, string>

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
  locale: "en",
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
  const res = await fetch(`/locales/${code}.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching /locales/${code}.json`)
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const authUser = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [locale, setLocaleState] = useState("en")
  const [dict, setDict] = useState<TranslationDict>(EN_SEED)
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

  // Load locale data
  useEffect(() => {
    const code = (() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("moistello_locale")
        if (stored) return stored
      }
      if (isAuthenticated && authUser?.preferredLanguage) return authUser.preferredLanguage
      return "en"
    })()

    setLocaleState(code)
    void loadLocale(code)
  }, [isAuthenticated, authUser?.preferredLanguage, loadLocale])

  const setLocale = useCallback(
    (lang: string) => {
      setLocaleState(lang)
      if (typeof window !== "undefined") localStorage.setItem("moistello_locale", lang)
      void loadLocale(lang)
      const state = useAuthStore.getState()
      if (state.isAuthenticated && state.user) {
        import("@/lib/api-client").then(({ patch }) => {
          patch("/users/me", { preferredLanguage: lang }).then(() => {
            const updatedUser = { ...state.user!, preferredLanguage: lang }
            import("@/stores/auth-store").then(({ useAuthStore: store }) => {
              store.getState().updateUser(updatedUser)
            })
          }).catch((e) => { logger.warn("[locale] Failed to persist language preference:", e) })
        })
      }
    },
    [loadLocale],
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
