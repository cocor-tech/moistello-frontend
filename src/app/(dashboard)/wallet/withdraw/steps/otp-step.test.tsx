import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { OtpStep } from "./otp-step"

describe("OtpStep Component", () => {
  it("renders OTP input and triggers onResend when Resend button is clicked", () => {
    const onResend = vi.fn()
    const onVerify = vi.fn()
    const onOtpChange = vi.fn()

    render(
      <OtpStep
        otp={["1", "2", "3", "4", "5", "6"]}
        loading={false}
        errMsg=""
        resendCooldown={0}
        onOtpChange={onOtpChange}
        onVerify={onVerify}
        onResend={onResend}
      />
    )

    const resendBtn = screen.getByRole("button", { name: /^resend/i })
    expect(resendBtn).not.toBeDisabled()

    fireEvent.click(resendBtn)
    expect(onResend).toHaveBeenCalledTimes(1)
  })

  it("disables Resend button during cooldown and displays countdown", () => {
    render(
      <OtpStep
        otp={["", "", "", "", "", ""]}
        loading={false}
        errMsg=""
        resendCooldown={45}
        onOtpChange={vi.fn()}
        onVerify={vi.fn()}
        onResend={vi.fn()}
      />
    )

    const resendBtn = screen.getByRole("button", { name: /resend in 45s/i })
    expect(resendBtn).toBeDisabled()
  })

  it("disables Resend button during active loading state", () => {
    render(
      <OtpStep
        otp={["1", "2", "3", "4", "5", "6"]}
        loading={true}
        errMsg=""
        resendCooldown={0}
        onOtpChange={vi.fn()}
        onVerify={vi.fn()}
        onResend={vi.fn()}
      />
    )

    const resendBtn = screen.getByRole("button", { name: /^resend/i })
    expect(resendBtn).toBeDisabled()
  })
})
