import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { HCaptchaCaptcha } from "../hcaptcha-captcha"

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe("HCaptchaCaptcha", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(window, "hcaptcha", {
      configurable: true,
      value: {
        render: vi.fn().mockReturnValue("widget-123"),
        execute: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn(),
        remove: vi.fn(),
        getResponse: vi.fn().mockReturnValue("mock-token"),
      },
    })
    Object.defineProperty(window, "onCaptchaReady", {
      configurable: true,
      value: undefined,
    })
    const existingScript = document.getElementById("hcaptcha-sdk")
    if (existingScript) existingScript.remove()
  })

  it("shows 'CAPTCHA not configured' when site key is missing", () => {
    const originalEnv = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

    render(<HCaptchaCaptcha onVerify={vi.fn()} />)

    expect(screen.getByText("CAPTCHA not configured")).toBeInTheDocument()

    if (originalEnv) process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = originalEnv
  })

  it("shows loading state while script loads", () => {
    // Ensure site key is set to bypass the "not configured" branch
    const originalEnv = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = "test-key"

    render(<HCaptchaCaptcha onVerify={vi.fn()} />)

    expect(screen.getByText(/loading verification/i)).toBeInTheDocument()

    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = originalEnv
  })

  it("exposes reset function via ref", () => {
    const ref = { current: null }
    render(<HCaptchaCaptcha ref={ref} onVerify={vi.fn()} />)

    expect(ref.current).toHaveProperty("reset")
    expect(typeof ref.current?.reset).toBe("function")
  })

  it("shows 'CAPTCHA not configured' with custom className", () => {
    const originalEnv = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

    render(<HCaptchaCaptcha onVerify={vi.fn()} className="custom-class" />)

    const container = screen.getByText("CAPTCHA not configured").parentElement
    expect(container).toHaveClass("custom-class")

    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = originalEnv
  })

  it("does not render captcha UI when site key is missing", () => {
    const originalEnv = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

    render(<HCaptchaCaptcha onVerify={vi.fn()} />)

    expect(screen.queryByTestId("hcaptcha-container")).not.toBeInTheDocument()

    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = originalEnv
  })

  it("renders without crashing when site key is provided", () => {
    render(<HCaptchaCaptcha onVerify={vi.fn()} />)

    expect(screen.getByText(/loading verification/i)).toBeInTheDocument()
  })
})