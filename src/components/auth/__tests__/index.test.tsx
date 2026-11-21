import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import React from "react"
import * as AuthModule from "../index"

describe("Auth Component Exports (src/components/auth/index.ts)", () => {
  it("exports all expected auth components from the barrel file", () => {
    expect(AuthModule.AuthStepIndicator).toBeDefined()
    expect(AuthModule.AuthWalletCard).toBeDefined()
    expect(AuthModule.AuthConnectionState).toBeDefined()
    expect(AuthModule.AuthErrorBoundary).toBeDefined()
    expect(AuthModule.AuthLayout).toBeDefined()
    expect(AuthModule.AuthInput).toBeDefined()
    expect(AuthModule.WalletGrid).toBeDefined()
    expect(AuthModule.ConnectedBadge).toBeDefined()
    expect(AuthModule.ErrorDisplay).toBeDefined()
    expect(AuthModule.OfflineBanner).toBeDefined()
    expect(AuthModule.ChooseWalletStep).toBeDefined()
    expect(AuthModule.ProfileStep).toBeDefined()
    expect(AuthModule.SignStep).toBeDefined()
    expect(AuthModule.LoadingOverlay).toBeDefined()
    expect(AuthModule.VerifyEmailStep).toBeDefined()
  })

  describe("Primary Render & Behavior Paths", () => {
    it("renders AuthLayout with children and custom title", () => {
      render(
        <AuthModule.AuthLayout title="Authenticate Your Account">
          <div data-testid="auth-child">Welcome Content</div>
        </AuthModule.AuthLayout>
      )

      expect(screen.getByText("Authenticate Your Account")).toBeInTheDocument()
      expect(screen.getByTestId("auth-child")).toBeInTheDocument()
    })

    it("renders AuthInput and accepts user input", () => {
      const handleChange = vi.fn()
      render(
        <AuthModule.AuthInput
          label="Email Address"
          placeholder="you@example.com"
          onChange={handleChange}
        />
      )

      const input = screen.getByPlaceholderText("you@example.com")
      expect(input).toBeInTheDocument()
      fireEvent.change(input, { target: { value: "test@stellar.org" } })
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it("renders LoadingOverlay with custom message and polite aria-live", () => {
      render(<AuthModule.LoadingOverlay message="Connecting to wallet..." />)

      const overlay = screen.getByRole("status")
      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveAttribute("aria-label", "Connecting to wallet...")
      expect(screen.getByText("Connecting to wallet...")).toBeInTheDocument()
    })

    it("renders ConnectedBadge with wallet name and disconnect action", () => {
      const handleDisconnect = vi.fn()
      render(
        <AuthModule.ConnectedBadge
          walletName="Freighter"
          address="GBBD7TESTNETWALLETADDRESS123456789012345678901234567890"
          onDisconnect={handleDisconnect}
        />
      )

      expect(screen.getByText("Freighter")).toBeInTheDocument()
      const disconnectBtn = screen.getByRole("button", { name: /disconnect wallet/i })
      fireEvent.click(disconnectBtn)
      expect(handleDisconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe("Failure and Edge Case Paths", () => {
    it("renders AuthErrorBoundary alert UI when error is present and handles retry/back callbacks", () => {
      const handleRetry = vi.fn()
      const handleBack = vi.fn()

      const { rerender } = render(
        <AuthModule.AuthErrorBoundary
          error={{ code: "signature_rejected", message: "User rejected the transaction signature." }}
          onRetry={handleRetry}
          onBack={handleBack}
        />
      )

      const alert = screen.getByRole("alert")
      expect(alert).toBeInTheDocument()
      expect(screen.getByText(/signature rejected/i)).toBeInTheDocument()
      expect(screen.getByText("User rejected the transaction signature.")).toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: /retry/i }))
      expect(handleRetry).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole("button", { name: /back/i }))
      expect(handleBack).toHaveBeenCalledTimes(1)

      // When error is null, it renders nothing
      rerender(<AuthModule.AuthErrorBoundary error={null} />)
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("renders ErrorDisplay and handles retry action", () => {
      const handleRetry = vi.fn()
      const { rerender } = render(
        <AuthModule.ErrorDisplay
          code="connection_timeout"
          message="Failed to connect to the Stellar Horizon endpoint."
          canRetry={true}
          onRetry={handleRetry}
        />
      )

      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Connection Timeout")).toBeInTheDocument()
      expect(screen.getByText("Failed to connect to the Stellar Horizon endpoint.")).toBeInTheDocument()

      const retryBtn = screen.getByRole("button", { name: /retry/i })
      fireEvent.click(retryBtn)
      expect(handleRetry).toHaveBeenCalledTimes(1)

      // Returns null when no code and no message
      rerender(<AuthModule.ErrorDisplay code={null} message={null} />)
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })
})
