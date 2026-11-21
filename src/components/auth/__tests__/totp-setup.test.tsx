import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TOTPSetup } from "../totp-setup"

const mockToCanvas = vi.fn()
vi.mock("qrcode", () => ({
  default: {
    toCanvas: (...args: any[]) => mockToCanvas(...args),
  },
  toCanvas: (...args: any[]) => mockToCanvas(...args),
}))

describe("TOTPSetup", () => {
  const defaultProps = {
    totpUri: "otpauth://totp/Moistello:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Moistello",
    totpSecret: "JBSWY3DPEHPK3PXP",
    onConfirm: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders heading, instructions, QR code canvas, and manual secret code", async () => {
    render(<TOTPSetup {...defaultProps} />)

    expect(screen.getByText("Set Up Two-Factor Authentication")).toBeInTheDocument()
    expect(
      screen.getByText(/Scan this QR code with your authenticator app/i)
    ).toBeInTheDocument()

    const canvas = screen.getByRole("img", { name: "QR code for authenticator app setup" })
    expect(canvas).toBeInTheDocument()

    expect(screen.getByText(defaultProps.totpSecret)).toBeInTheDocument()

    await waitFor(() => {
      expect(mockToCanvas).toHaveBeenCalledWith(
        expect.anything(),
        defaultProps.totpUri,
        expect.objectContaining({
          width: 200,
          margin: 2,
        })
      )
    })
  })

  it("disables 'Confirm & Continue' button until 6 digits are entered", () => {
    render(<TOTPSetup {...defaultProps} />)

    const confirmButton = screen.getByRole("button", { name: /confirm & continue/i })
    expect(confirmButton).toBeDisabled()

    const input = screen.getByLabelText(/Enter the 6-digit code from your authenticator app/i)
    fireEvent.change(input, { target: { value: "12345" } })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(input, { target: { value: "123456" } })
    expect(confirmButton).not.toBeDisabled()
  })

  it("calls onConfirm with the entered code when clicked", async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined)
    render(<TOTPSetup {...defaultProps} onConfirm={handleConfirm} />)

    const input = screen.getByLabelText(/Enter the 6-digit code from your authenticator app/i)
    fireEvent.change(input, { target: { value: "654321" } })

    const confirmButton = screen.getByRole("button", { name: /confirm & continue/i })
    fireEvent.click(confirmButton)

    expect(handleConfirm).toHaveBeenCalledWith("654321")
  })

  it("renders error message when error prop is provided", () => {
    render(<TOTPSetup {...defaultProps} error="Invalid verification code. Please try again." />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid verification code. Please try again."
    )
  })

  it("shows loading state when isLoading is true", () => {
    render(<TOTPSetup {...defaultProps} isLoading={true} />)

    const confirmButton = screen.getByRole("button", { name: /confirm & continue/i })
    expect(confirmButton).toBeDisabled()
  })
})
