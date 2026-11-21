import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PasskeyErrorBanner } from "../passkey-error-banner"

describe("PasskeyErrorBanner", () => {
  it("renders the error title, description, and role='alert' with aria-live='assertive'", () => {
    render(
      <PasskeyErrorBanner
        title="Passkey Authentication Failed"
        description="The device biometric prompt timed out."
        kind="timeout"
        canRetry={false}
      />
    )

    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveAttribute("aria-live", "assertive")
    expect(screen.getByText("Passkey Authentication Failed")).toBeInTheDocument()
    expect(screen.getByText("The device biometric prompt timed out.")).toBeInTheDocument()
  })

  it("renders retry button when canRetry is true and onRetry is provided, and handles click", () => {
    const handleRetry = vi.fn()
    render(
      <PasskeyErrorBanner
        title="Network Error"
        description="Please check your connection and try again."
        kind="network"
        canRetry={true}
        onRetry={handleRetry}
      />
    )

    const retryButton = screen.getByRole("button", { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it("does not render retry button if canRetry is false even if onRetry is provided", () => {
    const handleRetry = vi.fn()
    render(
      <PasskeyErrorBanner
        title="Device Unsupported"
        description="This device does not support passkeys."
        kind="unsupported_device"
        canRetry={false}
        onRetry={handleRetry}
      />
    )

    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull()
  })

  it("renders 'Use a different method' button when onSwitchMethod is provided, and handles click", () => {
    const handleSwitchMethod = vi.fn()
    render(
      <PasskeyErrorBanner
        title="Authentication Cancelled"
        description="Prompt was cancelled."
        kind="cancelled"
        canRetry={false}
        onSwitchMethod={handleSwitchMethod}
      />
    )

    const switchButton = screen.getByRole("button", { name: /use a different method/i })
    expect(switchButton).toBeInTheDocument()
    fireEvent.click(switchButton)
    expect(handleSwitchMethod).toHaveBeenCalledTimes(1)
  })

  it("renders both retry and switch buttons when both are configured", () => {
    const handleRetry = vi.fn()
    const handleSwitchMethod = vi.fn()
    render(
      <PasskeyErrorBanner
        title="Security Error"
        description="Security constraint violated."
        kind="security_error"
        canRetry={true}
        onRetry={handleRetry}
        onSwitchMethod={handleSwitchMethod}
      />
    )

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /use a different method/i })).toBeInTheDocument()
  })

  it("renders default fallback icon when unknown kind is provided", () => {
    const { container } = render(
      <PasskeyErrorBanner
        title="Unknown Issue"
        description="Something went wrong."
        kind={"unknown" as any}
        canRetry={false}
      />
    )

    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
