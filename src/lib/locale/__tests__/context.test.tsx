import { render, screen, act, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

const authState = {
  isAuthenticated: false,
  user: null as { preferredLanguage?: string } | null,
}

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: Object.assign(
    (selector: (s: typeof authState) => unknown) => selector(authState),
    { getState: () => authState },
  ),
}))

import { LocaleProvider, useTranslate } from "@/lib/locale/context"
import { logger } from "@/lib/logger"

function Consumer() {
  const { t, locale, fallbackLocale } = useTranslate()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="fallback-locale">{fallbackLocale ?? ""}</span>
      <span data-testid="greeting">{t("common.loading")}</span>
    </div>
  )
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

async function settle(ms = 2500) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function setup() {
  return render(
    <LocaleProvider>
      <Consumer />
    </LocaleProvider>,
  )
}

describe("LocaleProvider fetch failure handling", () => {
  const originalFetch = globalThis.fetch
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("renders fetched translations and shows no banner on success", async () => {
    localStorage.setItem("moistello_locale", "de")
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ "common.loading": "Wird geladen..." }))
    vi.stubGlobal("fetch", mockFetch)

    setup()
    await settle()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByTestId("greeting")).toHaveTextContent("Wird geladen...")
    expect(screen.getByTestId("fallback-locale")).toHaveTextContent("")
  })

  it("retries with backoff, then falls back to English with a visible notice", async () => {
    localStorage.setItem("moistello_locale", "fr")
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    vi.stubGlobal("fetch", mockFetch)

    setup()

    // First attempt happens immediately
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Exhaust remaining attempts across the backoff delays (500ms + 1000ms)
    await settle()

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load "fr"'), expect.anything())
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Falling back to English"))

    // English dictionary is served as fallback
    expect(screen.getByTestId("greeting")).toHaveTextContent("Loading...")
    // The failure is surfaced to the user instead of being silent
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByTestId("locale-fallback-banner")).toHaveTextContent("fr")
    expect(screen.getByTestId("fallback-locale")).toHaveTextContent("fr")
  })

  it("does not cache the failure: retrying from the banner recovers once the network does", async () => {
    localStorage.setItem("moistello_locale", "es")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")))
    setup()
    await settle()
    expect(screen.getByRole("alert")).toBeInTheDocument()

    const succeeding = vi.fn().mockResolvedValue(jsonResponse({ "common.loading": "Cargando..." }))
    vi.stubGlobal("fetch", succeeding)

    fireEvent.click(screen.getByRole("button", { name: /retry/i }))
    await settle()

    expect(succeeding).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("greeting")).toHaveTextContent("Cargando...")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("hides the notice when dismissed while still serving English", async () => {
    localStorage.setItem("moistello_locale", "it")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")))
    setup()
    await settle()
    expect(screen.getByRole("alert")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }))

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    // Still serving English after dismissal
    expect(screen.getByTestId("greeting")).toHaveTextContent("Loading...")
  })
})
