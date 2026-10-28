import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"
import { SignStep } from "../sign-step"
import { LocaleProvider } from "@/lib/locale/context"

describe("SignStep Component", () => {
  const defaultProps = {
    mode: "login" as const,
    connection: {
      walletId: "freighter",
      address: "GBJGV2EXABCDEF1234567890TESTNETADDRESS",
    },
    profile: {
      displayName: "Jane Doe",
      countryCode: "US",
      language: "en",
    },
    auth: {
      nonce: "mock-nonce-12345",
      signature: null,
      nonceTimestamp: Date.now(),
    },
    status: { status: "idle" as const },
    error: null,
    onSign: vi.fn().mockResolvedValue(undefined),
    onBack: vi.fn(),
  }

  const renderComponent = (props = {}) => {
    return render(
      <LocaleProvider>
        <SignStep {...defaultProps} {...props} />
      </LocaleProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders in login mode with wallet badge and sign in button", () => {
    renderComponent({ mode: "login" })

    expect(screen.getByText("freighter")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("renders in register mode with profile summary and create account button", () => {
    renderComponent({ mode: "register" })

    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /createaccount|create account/i })).toBeInTheDocument()
  })

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn()
    renderComponent({ onBack })

    fireEvent.click(screen.getByRole("button", { name: /go back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("calls onSign when sign button is clicked", async () => {
    const onSign = vi.fn().mockResolvedValue(undefined)
    renderComponent({ onSign })

    const signButton = screen.getByRole("button", { name: /sign in/i })
    fireEvent.click(signButton)

    await waitFor(() => {
      expect(onSign).toHaveBeenCalledTimes(1)
    })
  })

  it("shows error display when error prop is provided and allows retry", async () => {
    const onSign = vi.fn().mockResolvedValue(undefined)
    renderComponent({
      error: {
        code: "connection_timeout",
        message: "Wallet request timed out.",
      },
      status: { status: "error" as const },
      onSign,
    })

    expect(screen.getByText("Wallet request timed out.")).toBeInTheDocument()
    const retryButton = screen.getByRole("button", { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    await waitFor(() => {
      expect(onSign).toHaveBeenCalledTimes(1)
    })
  })

  it("renders authenticated status when login succeeds", () => {
    renderComponent({
      status: { status: "authenticated" as const },
    })

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument()
  })

  it("shows signed state when message is already signed", () => {
    renderComponent({
      status: { status: "signed" as const },
      auth: {
        nonce: "mock-nonce-12345",
        signature: "valid-signature-hex",
        nonceTimestamp: Date.now(),
      },
    })

    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument()
  })

  it("displays cooldown warning and disables button when on rate-limit cooldown", () => {
    renderComponent({
      rateLimit: {
        remainingAttempts: 0,
        cooldownUntil: Date.now() + 60000,
        lastAttemptAt: Date.now(),
      },
    })

    expect(screen.getByRole("status")).toBeInTheDocument()
    const button = screen.getByRole("button", { name: /wait/i })
    expect(button).toBeDisabled()
  })

  it("displays remaining attempts when fewer than 5 attempts remain", () => {
    renderComponent({
      rateLimit: {
        remainingAttempts: 3,
        cooldownUntil: null,
        lastAttemptAt: Date.now(),
      },
    })

    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it("recovers gracefully if onSign throws", async () => {
    const onSign = vi.fn().mockRejectedValue(new Error("User rejected signature"))
    renderComponent({ onSign })

    const signButton = screen.getByRole("button", { name: /sign in/i })
    fireEvent.click(signButton)

    await waitFor(() => {
      expect(onSign).toHaveBeenCalledTimes(1)
      expect(signButton).not.toBeDisabled()
    })
  })
})
