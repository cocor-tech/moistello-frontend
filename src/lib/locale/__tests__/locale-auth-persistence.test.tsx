/**
 * Locale persistence across the auth redirect.
 *
 * The bug this guards: a visitor picks a language on a public page, signs in,
 * and the interface springs back to English. The cause is a race between two
 * sources of truth — the browser's own choice and the profile's
 * `preferredLanguage`, which is still the default at that moment because
 * nothing ever told the server.
 */
import { useSyncExternalStore } from "react"
import { render, screen, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { LOCALE_COOKIE, readLocaleCookie } from "../locale-cookie"
import { getServerDictionary } from "../server-dictionaries"
import { logger } from "@/lib/logger"

const patch = vi.fn().mockResolvedValue({ data: {} })

vi.mock("@/lib/api-client", () => ({ patch: (...args: unknown[]) => patch(...args) }))

/**
 * A reactive stand-in for the auth store. It has to actually notify
 * subscribers: the behaviour under test is a re-render triggered by auth
 * resolving after the first paint, which a plain object mock cannot produce.
 */
const authMock = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  let state: { isAuthenticated: boolean; user: { preferredLanguage?: string } | null } = {
    isAuthenticated: false,
    user: null,
  }

  return {
    getState: () => state,
    setState: (next: Partial<typeof state>) => {
      state = { ...state, ...next }
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset: () => {
      state = { isAuthenticated: false, user: null }
      listeners.clear()
    },
  }
})

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: Object.assign(
    (selector: (s: { isAuthenticated: boolean; user: unknown }) => unknown) =>
      useSyncExternalStore(authMock.subscribe, () => selector(authMock.getState())),
    {
      getState: authMock.getState,
      updateUser: (user: { preferredLanguage?: string }) => authMock.setState({ user }),
    },
  ),
}))

// Imported after the mocks so the provider picks them up.
import { LocaleProvider, useTranslate } from "@/lib/locale/context"

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function Consumer() {
  const { t, locale, setLocale } = useTranslate()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="wallet">{t("nav.wallet")}</span>
      <button type="button" data-testid="pick-fr" onClick={() => setLocale("fr")}>
        fr
      </button>
      <button type="button" data-testid="pick-ar" onClick={() => setLocale("ar")}>
        ar
      </button>
      <button type="button" data-testid="pick-junk" onClick={() => setLocale("../evil")}>
        junk
      </button>
    </div>
  )
}

function renderProvider(props: { initialLocale?: string; initialDictionary?: Record<string, string> } = {}) {
  return render(
    <LocaleProvider {...props}>
      <Consumer />
    </LocaleProvider>,
  )
}

async function settle(ms = 50) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function clearCookies() {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim()
    if (name) document.cookie = `${name}=; max-age=0; path=/`
  }
  document.documentElement.removeAttribute("lang")
  document.documentElement.removeAttribute("dir")
}

describe("locale persistence across the auth redirect", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    clearCookies()
    localStorage.clear()
    authMock.reset()
    patch.mockClear()
    patch.mockResolvedValue({ data: {} })
    vi.spyOn(logger, "warn").mockImplementation(() => {})
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ "nav.wallet": "WALLET-FROM-NETWORK" }))
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("keeps a language chosen while signed out after the profile loads", async () => {
    renderProvider()
    await settle()

    // The visitor picks French on a public page, with no session to save it to.
    await act(async () => {
      screen.getByTestId("pick-fr").click()
    })
    await settle()
    expect(screen.getByTestId("locale")).toHaveTextContent("fr")

    // Signing in resolves the profile, which still carries the default.
    await act(async () => {
      authMock.setState({ isAuthenticated: true, user: { preferredLanguage: "en" } })
    })
    await settle()

    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
    expect(document.documentElement.getAttribute("lang")).toBe("fr")
  })

  it("tells the server about a pre-auth choice so it follows the user", async () => {
    renderProvider()
    await settle()

    await act(async () => {
      screen.getByTestId("pick-fr").click()
    })
    await settle()

    // Signed out, so there is nothing to patch yet.
    expect(patch).not.toHaveBeenCalled()

    await act(async () => {
      authMock.setState({ isAuthenticated: true, user: { preferredLanguage: "en" } })
    })
    await settle()

    // Without this the choice would render here forever and be lost on the
    // next device, because the profile still says "en".
    expect(patch).toHaveBeenCalledWith("/users/me", { preferredLanguage: "fr" })
  })

  it("does not re-patch once the profile already agrees", async () => {
    renderProvider()
    await settle()

    await act(async () => {
      screen.getByTestId("pick-fr").click()
    })
    await settle()

    await act(async () => {
      authMock.setState({ isAuthenticated: true, user: { preferredLanguage: "fr" } })
    })
    await settle()

    expect(patch).not.toHaveBeenCalled()
  })

  it("lets the profile decide on a device with no choice of its own", async () => {
    renderProvider()
    await settle()

    await act(async () => {
      authMock.setState({ isAuthenticated: true, user: { preferredLanguage: "fr" } })
    })
    await settle()

    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
  })

  it("writes the choice to the cookie the server reads", async () => {
    renderProvider()
    await settle()

    await act(async () => {
      screen.getByTestId("pick-fr").click()
    })
    await settle()

    // The cookie is what middleware turns into x-locale, so without it the very
    // next document request renders English.
    expect(readLocaleCookie()).toBe("fr")
    expect(document.cookie).toContain(LOCALE_COOKIE)
    expect(localStorage.getItem(LOCALE_COOKIE)).toBe("fr")
  })

  it("patches the profile when the language is changed while signed in", async () => {
    renderProvider()
    await settle()
    await act(async () => {
      authMock.setState({ isAuthenticated: true, user: { preferredLanguage: "en" } })
    })
    await settle()
    patch.mockClear()

    await act(async () => {
      screen.getByTestId("pick-fr").click()
    })
    await settle()

    expect(patch).toHaveBeenCalledWith("/users/me", { preferredLanguage: "fr" })
  })

  it("keeps the language working when the profile patch fails", async () => {
    patch.mockRejectedValue(new Error("offline"))
    renderProvider()
    await settle()

    await act(async () => {
      screen.getByTestId("pick-fr").click()
    })
    await settle()

    // The cross-device copy failed, but nothing the visitor can see should.
    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
    expect(readLocaleCookie()).toBe("fr")
  })

  it("rejects a malformed locale instead of persisting it", async () => {
    renderProvider()
    await settle()

    await act(async () => {
      screen.getByTestId("pick-junk").click()
    })
    await settle()

    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(readLocaleCookie()).toBeNull()
  })

  it("flips the document direction for a right-to-left language", async () => {
    renderProvider()
    await settle()

    await act(async () => {
      screen.getByTestId("pick-ar").click()
    })
    await settle()

    expect(document.documentElement.getAttribute("lang")).toBe("ar")
    expect(document.documentElement.getAttribute("dir")).toBe("rtl")
  })
})

describe("server-rendered dictionary handoff", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearCookies()
    localStorage.clear()
    authMock.reset()
    patch.mockClear()
    vi.spyOn(logger, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("renders the server's dictionary with no fetch and no flash", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    // What the root layout hands down after reading the cookie.
    renderProvider({
      initialLocale: "fr",
      initialDictionary: getServerDictionary("fr"),
    })

    // Synchronously, from the very first render — no effect has run yet, so
    // this is precisely the text that was server-rendered.
    expect(screen.getByTestId("wallet")).toHaveTextContent("Portefeuille")
    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("leaves the rendered dictionary alone once auth confirms that locale", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    renderProvider({
      initialLocale: "fr",
      initialDictionary: getServerDictionary("fr"),
    })

    await act(async () => {
      authMock.setState({ isAuthenticated: true, user: { preferredLanguage: "fr" } })
    })

    expect(screen.getByTestId("wallet")).toHaveTextContent("Portefeuille")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("fetches only when the active locale differs from what the server rendered", async () => {
    // Held open so the first paint can be inspected before the client fetch
    // resolves — otherwise act() flushes it and the swap is never observable.
    let release!: (value: unknown) => void
    const pending = new Promise((resolve) => {
      release = resolve
    })
    const fetchMock = vi.fn().mockReturnValue(pending)
    vi.stubGlobal("fetch", fetchMock)

    // Server rendered English; the visitor's stored choice is German. German
    // rather than French because dictionaries are cached module-wide for the
    // life of the page, and the block above already filled the French slot.
    localStorage.setItem(LOCALE_COOKIE, "de")
    renderProvider({ initialLocale: "en", initialDictionary: getServerDictionary("en") })

    // First paint is still what the server sent.
    expect(screen.getByTestId("wallet")).toHaveTextContent("Wallet")
    expect(fetchMock).toHaveBeenCalledWith("/locale/de.json")

    await act(async () => {
      release(jsonResponse({ "nav.wallet": "Geldbörse (Netzwerk)" }))
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId("locale")).toHaveTextContent("de")
    expect(screen.getByTestId("wallet")).toHaveTextContent("Geldbörse (Netzwerk)")
  })
})
