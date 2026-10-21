import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"
import { VerifyEmailStep } from "../verify-email-step"

const mockStoreState = {
  status: { status: "idle" as const, message: "" },
  emailVerification: {
    email: null as string | null,
    codeSent: false,
    codeVerified: false,
  },
  sendVerificationCode: vi.fn(),
  verifyCode: vi.fn(),
  resendCode: vi.fn(),
  clearEmailVerification: vi.fn(),
}

vi.mock("@/stores/auth-flow-store", () => ({
  useAuthFlowStore: <T,>(selector: (state: typeof mockStoreState) => T): T =>
    selector(mockStoreState),
}))

describe("VerifyEmailStep component (#619)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.status = { status: "idle", message: "" }
    mockStoreState.emailVerification = {
      email: null,
      codeSent: false,
      codeVerified: false,
    }
  })

  it("renders email input screen initially with disabled submit button", () => {
    const onBack = vi.fn()
    const onVerified = vi.fn()

    render(<VerifyEmailStep onBack={onBack} onVerified={onVerified} />)

    expect(screen.getByText("Verify Your Email")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()

    const sendBtn = screen.getByRole("button", { name: /send code/i })
    expect(sendBtn).toBeDisabled()

    // Test back button
    const backBtn = screen.getByRole("button", { name: /back to wallet options/i })
    fireEvent.click(backBtn)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("enables send code button on valid email and calls sendVerificationCode", async () => {
    mockStoreState.sendVerificationCode.mockResolvedValue(undefined)
    const onBack = vi.fn()
    const onVerified = vi.fn()

    render(<VerifyEmailStep onBack={onBack} onVerified={onVerified} />)

    const input = screen.getByPlaceholderText("you@example.com")
    fireEvent.change(input, { target: { value: "user@example.com" } })

    const sendBtn = screen.getByRole("button", { name: /send code/i })
    expect(sendBtn).not.toBeDisabled()

    fireEvent.click(sendBtn)
    await waitFor(() => {
      expect(mockStoreState.sendVerificationCode).toHaveBeenCalledWith("user@example.com")
    })
  })

  it("renders OTP verification screen when code is sent", async () => {
    mockStoreState.emailVerification = {
      email: "user@example.com",
      codeSent: true,
      codeVerified: false,
    }
    mockStoreState.verifyCode.mockResolvedValue(undefined)
    mockStoreState.resendCode.mockResolvedValue(undefined)

    const onBack = vi.fn()
    const onVerified = vi.fn()

    render(<VerifyEmailStep onBack={onBack} onVerified={onVerified} />)

    expect(screen.getByText(/We sent a code to/i)).toBeInTheDocument()
    expect(screen.getByText("user@example.com")).toBeInTheDocument()

    const verifyBtn = screen.getByRole("button", { name: /verify code/i })
    expect(verifyBtn).toBeDisabled()

    // Test resend button
    const resendBtn = screen.getByRole("button", { name: /didn't receive it\? resend/i })
    fireEvent.click(resendBtn)
    expect(mockStoreState.resendCode).toHaveBeenCalledTimes(1)

    // Test change email button
    const changeEmailBtn = screen.getByRole("button", { name: /change email/i })
    fireEvent.click(changeEmailBtn)
    expect(mockStoreState.clearEmailVerification).toHaveBeenCalledTimes(1)
  })

  it("renders verified state and triggers onVerified callback", async () => {
    vi.useFakeTimers()
    mockStoreState.emailVerification = {
      email: "user@example.com",
      codeSent: true,
      codeVerified: true,
    }

    const onBack = vi.fn()
    const onVerified = vi.fn()

    render(<VerifyEmailStep onBack={onBack} onVerified={onVerified} />)

    expect(screen.getByText("Email verified!")).toBeInTheDocument()

    vi.advanceTimersByTime(700)
    expect(onVerified).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("displays error message when status is error", () => {
    mockStoreState.status = { status: "error", message: "Invalid verification code" }
    mockStoreState.emailVerification = {
      email: "user@example.com",
      codeSent: true,
      codeVerified: false,
    }

    render(<VerifyEmailStep onBack={vi.fn()} onVerified={vi.fn()} />)

    expect(screen.getByText("Invalid verification code")).toBeInTheDocument()
  })
})
