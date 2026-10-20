import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

import { TurnstileCaptcha } from "../turnstile-captcha"

const SCRIPT_ID = "cf-turnstile-sdk"
const SITE_KEY = "test-site-key"

type TurnstileOptions = Record<string, unknown>

function getTurnstile() {
  return window.turnstile as unknown as {
    render: ReturnType<typeof vi.fn>
    reset: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }
}

/** Seed the SDK script tag + window.turnstile so loadScript() resolves immediately. */
function seedSdk(renderImpl?: (container: unknown, options: TurnstileOptions) => string) {
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script")
    script.id = SCRIPT_ID
    document.head.appendChild(script)
  }
  window.turnstile = {
    render:
      renderImpl ??
      vi.fn((_container: unknown, _options: TurnstileOptions) => "widget-1"),
    reset: vi.fn(),
    remove: vi.fn(),
  }
}

function latestOptions(): TurnstileOptions {
  const calls = getTurnstile().render.mock.calls
  return calls[calls.length - 1][1] as TurnstileOptions
}

describe("TurnstileCaptcha (#624)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", SITE_KEY)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    document.getElementById(SCRIPT_ID)?.remove()
    delete window.turnstile
  })

  it("shows a not-configured notice and loads nothing when the site key is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "")

    render(<TurnstileCaptcha onVerify={vi.fn()} />)

    expect(screen.getByText("CAPTCHA not configured")).toBeInTheDocument()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders the Turnstile widget with the site key and shows the loading status", async () => {
    seedSdk()

    render(<TurnstileCaptcha onVerify={vi.fn()} />)

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Loading verification...",
    )
    await vi.waitFor(() => expect(getTurnstile().render).toHaveBeenCalledTimes(1))

    const [container, options] = getTurnstile().render.mock.calls[0]
    expect(container).toBeInstanceOf(HTMLElement)
    expect(options.sitekey).toBe(SITE_KEY)
  })

  it("marks the captcha verified and forwards the token via onVerify", async () => {
    seedSdk()

    const onVerify = vi.fn()
    render(<TurnstileCaptcha onVerify={onVerify} />)

    await vi.waitFor(() => expect(getTurnstile().render).toHaveBeenCalledTimes(1))
    const { callback } = latestOptions() as { callback: (token: string) => void }

    act(() => callback("token-abc"))

    expect(screen.getByText("Verified")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(onVerify).toHaveBeenCalledTimes(1)
    expect(onVerify).toHaveBeenCalledWith("token-abc")
  })

  it("enters the error state on token expiry and recovers via Retry", async () => {
    seedSdk()

    const onVerify = vi.fn()
    const onError = vi.fn()
    render(<TurnstileCaptcha onVerify={onVerify} onError={onError} />)

    await vi.waitFor(() => expect(getTurnstile().render).toHaveBeenCalledTimes(1))
    act(() => (latestOptions()["expired-callback"] as () => void)())

    expect(screen.getByRole("alert")).toHaveTextContent("Verification unavailable")
    expect(onError).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(getTurnstile().remove).toHaveBeenCalledWith("widget-1")
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Loading verification...",
    )
    await vi.waitFor(() => expect(getTurnstile().render).toHaveBeenCalledTimes(2))

    act(() => (latestOptions().callback as (token: string) => void)("token-retry"))

    expect(screen.getByText("Verified")).toBeInTheDocument()
    expect(onVerify).toHaveBeenCalledWith("token-retry")
  })

  it("stops after three failed init attempts and surfaces the error state", async () => {
    seedSdk(
      vi.fn(() => {
        throw new Error("render failed")
      }),
    )

    const onVerify = vi.fn()
    const onError = vi.fn()
    render(<TurnstileCaptcha onVerify={onVerify} onError={onError} />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verification unavailable",
    )
    expect(getTurnstile().render).toHaveBeenCalledTimes(3)
    expect(onError).toHaveBeenCalledTimes(3)
    expect(onVerify).not.toHaveBeenCalled()
  })

  it("removes the managed widget on unmount", async () => {
    seedSdk()

    const { unmount } = render(<TurnstileCaptcha onVerify={vi.fn()} />)
    await vi.waitFor(() => expect(getTurnstile().render).toHaveBeenCalledTimes(1))

    unmount()

    expect(getTurnstile().remove).toHaveBeenCalledWith("widget-1")
  })
})
