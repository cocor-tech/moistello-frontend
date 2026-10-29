/**
 * hcaptcha-captcha.test.tsx
 *
 * Component tests for <HCaptchaCaptcha> covering:
 *  - unconfigured (missing site key) fallback
 *  - successful SDK init and ready state
 *  - verify interaction and verified state
 *  - expired state with retry control
 *  - init failure surfaces an alert with retry
 */

import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HCaptchaCaptcha } from "../hcaptcha-captcha"

// ── hCaptcha SDK stub ────────────────────────────────────────────────────────

type RenderOptions = Record<string, unknown>

interface MockHcaptcha {
  render: ReturnType<typeof vi.fn>
  execute: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  getResponse: ReturnType<typeof vi.fn>
  lastOptions: RenderOptions | null
}

function createMockHcaptcha(): MockHcaptcha {
  const mock: MockHcaptcha = {
    render: vi.fn((_container: HTMLElement, options: RenderOptions) => {
      mock.lastOptions = options
      return "widget-1"
    }),
    execute: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    remove: vi.fn(),
    getResponse: vi.fn().mockReturnValue(""),
    lastOptions: null,
  }
  return mock
}

const SITE_KEY = "10000000-ffff-ffff-ffff-000000000001"

function setSiteKey(value: string | undefined) {
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  } else {
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = value
  }
}

async function renderReady(api: MockHcaptcha) {
  const onVerify = vi.fn()
  const utils = render(<HCaptchaCaptcha onVerify={onVerify} />)
  await waitFor(() => expect(api.render).toHaveBeenCalled())
  await screen.findByRole("button", { name: /verify you are human/i })
  return { ...utils, onVerify }
}

beforeEach(() => {
  setSiteKey(SITE_KEY)
  vi.stubGlobal("hcaptcha", createMockHcaptcha())
  // Pre-insert the SDK script tag so loadScript() resolves synchronously
  // (jsdom never fires load events for external scripts)
  const script = document.createElement("script")
  script.id = "hcaptcha-sdk"
  document.head.appendChild(script)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  document.getElementById("hcaptcha-sdk")?.remove()
})

describe("HCaptchaCaptcha", () => {
  it("renders an unconfigured notice when the site key is missing", () => {
    setSiteKey(undefined)
    render(<HCaptchaCaptcha onVerify={vi.fn()} />)
    expect(screen.getByText("CAPTCHA not configured")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows a loading status while the SDK initializes", () => {
    // No script tag present yet → loadScript() waits on onload (never fires in jsdom)
    document.getElementById("hcaptcha-sdk")?.remove()
    const api = window.hcaptcha as unknown as MockHcaptcha
    render(<HCaptchaCaptcha onVerify={vi.fn()} />)
    expect(api.render).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent(/loading verification/i)
  })

  it("renders the verify button once the widget is ready", async () => {
    const api = window.hcaptcha as unknown as MockHcaptcha
    await renderReady(api)
    expect(screen.getByRole("button", { name: /verify you are human/i })).toBeEnabled()
  })

  it("executes the challenge and reports the token via onVerify", async () => {
    const user = userEvent.setup()
    const api = window.hcaptcha as unknown as MockHcaptcha
    const { onVerify } = await renderReady(api)

    await user.click(screen.getByRole("button", { name: /verify you are human/i }))
    expect(api.execute).toHaveBeenCalledWith("widget-1")
    await waitFor(() => expect(screen.getByText(/verifying/i)).toBeInTheDocument())

    // SDK fires the success callback registered during render
    const options = api.lastOptions as { callback: (token: string) => void }
    options.callback("captcha-token-abc")

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("captcha-token-abc"))
    expect(await screen.findByText("Verified")).toBeInTheDocument()
  })

  it("shows an error alert with retry when the challenge fails", async () => {
    const user = userEvent.setup()
    const api = window.hcaptcha as unknown as MockHcaptcha
    const onError = vi.fn()
    api.execute.mockRejectedValueOnce(new Error("challenge dismissed"))
    render(<HCaptchaCaptcha onVerify={vi.fn()} onError={onError} />)

    await waitFor(() => expect(api.render).toHaveBeenCalled())
    await user.click(await screen.findByRole("button", { name: /verify you are human/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/verification unavailable/i)
    expect(onError).toHaveBeenCalledWith("hCaptcha challenge failed")
  })

  it("offers a retry control in the expired state", async () => {
    const user = userEvent.setup()
    const api = window.hcaptcha as unknown as MockHcaptcha
    const onExpire = vi.fn()
    render(<HCaptchaCaptcha onVerify={vi.fn()} onExpire={onExpire} />)

    await waitFor(() => expect(api.render).toHaveBeenCalled())
    const options = api.lastOptions as { "expired-callback": () => void }
    options["expired-callback"]()

    expect(await screen.findByText(/verification expired/i)).toBeInTheDocument()
    expect(onExpire).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: /retry/i }))
    expect(api.reset).toHaveBeenCalledWith("widget-1")
  })

  it("surfaces an alert with retry when the widget fails to render", async () => {
    const user = userEvent.setup()
    const api = window.hcaptcha as unknown as MockHcaptcha
    const onError = vi.fn()
    api.render.mockImplementation(() => {
      throw new Error("render failed")
    })
    render(<HCaptchaCaptcha onVerify={vi.fn()} onError={onError} />)

    expect(await screen.findByRole("alert")).toHaveTextContent(/verification unavailable/i)
    expect(onError).toHaveBeenCalledWith("Failed to load hCaptcha")

    // Retry re-runs init with a fresh attempt
    api.render.mockImplementation(
      (_container: HTMLElement, options: RenderOptions) => {
        api.lastOptions = options
        return "widget-1"
      }
    )
    await user.click(screen.getByRole("button", { name: /retry/i }))
    await screen.findByRole("button", { name: /verify you are human/i })
  })
})
