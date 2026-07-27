"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import en from "./en.json"
import { useAuthStore } from "@/stores/auth-store"

type TranslationDict = Record<string, string>

interface LocaleContextType {
  locale: string
  setLocale: (lang: string) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
})

const cache: Record<string, TranslationDict> = { en }

export function useTranslate() {
  return useContext(LocaleContext)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const authUser = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [locale, setLocaleState] = useState("en")
  const [dict, setDict] = useState<TranslationDict>(en)

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
    if (cache[code]) {
      setDict(cache[code])
      return
    }

    fetch(`/locale/${code}.json`)
      .then((r) => r.json())
      .then((data) => {
        cache[code] = data as TranslationDict
        setDict(data as TranslationDict)
      })
      .catch(() => {
        cache[code] = en
        setDict(en)
      })
  }, [isAuthenticated, authUser?.preferredLanguage])

  const setLocale = useCallback((lang: string) => {
    setLocaleState(lang)
    if (typeof window !== "undefined") localStorage.setItem("moistello_locale", lang)
    if (cache[lang]) {
      setDict(cache[lang])
    } else {
      fetch(`/locale/${lang}.json`)
        .then((r) => r.json())
        .then((data) => {
          cache[lang] = data as TranslationDict
          setDict(data as TranslationDict)
        })
        .catch(() => { cache[lang] = en; setDict(en) })
    }
    const state = useAuthStore.getState()
    if (state.isAuthenticated && state.user) {
      import("@/lib/api-client").then(({ patch }) => {
        patch("/users/me", { preferredLanguage: lang }).then(() => {
          const updatedUser = { ...state.user!, preferredLanguage: lang }
          import("@/stores/auth-store").then(({ useAuthStore: store }) => {
            store.getState().updateUser(updatedUser)
          })
        }).catch((e) => { console.warn("[locale] Failed to persist language preference:", e) })
      })
    }
  }, [])

  const t = useCallback(
    (key: string): string => {
      if (dict && key in dict) return dict[key]
      if (key in en) return en[key as keyof typeof en]
      return key
    },
    [dict],
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}
