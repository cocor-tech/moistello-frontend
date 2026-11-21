import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { PasswordStrengthMeter } from "../password-strength-meter"

describe("PasswordStrengthMeter", () => {
  it("returns null when password is empty", () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders 'Too weak' score label and warning for weak passwords", () => {
    render(<PasswordStrengthMeter password="123" />)

    expect(screen.getByTestId("password-strength-meter")).toBeInTheDocument()
    expect(screen.getByText("Too weak")).toBeInTheDocument()
    expect(screen.getByText("Password is too short")).toBeInTheDocument()
  })

  it("renders common pattern warning when common weak password is used", () => {
    render(<PasswordStrengthMeter password="password123" />)

    expect(screen.getByText("Too weak")).toBeInTheDocument()
    expect(screen.getByText("This is a commonly used weak password")).toBeInTheDocument()
    expect(
      screen.getByText("Avoid common words and predictable character combinations")
    ).toBeInTheDocument()
  })

  it("renders 'Weak' score label for short passwords with low variety", () => {
    render(<PasswordStrengthMeter password="abcdefgh" />)

    expect(screen.getByText("Weak")).toBeInTheDocument()
  })

  it("renders 'Fair' score label for 8-9 character passwords with good variety", () => {
    render(<PasswordStrengthMeter password="Abc1!def" />)

    expect(screen.getByText("Fair")).toBeInTheDocument()
  })

  it("renders 'Good' score label for medium length diverse passwords", () => {
    render(<PasswordStrengthMeter password="Abc1!defghij" />)

    expect(screen.getByText("Good")).toBeInTheDocument()
  })

  it("renders 'Strong' score label and 4 filled step bars for strong diverse passwords", () => {
    const { container } = render(
      <PasswordStrengthMeter password="SuperSecure#Password99!" />
    )

    expect(screen.getByText("Strong")).toBeInTheDocument()

    const filledBars = container.querySelectorAll(".bg-emerald-500")
    expect(filledBars.length).toBe(4)
  })
})
