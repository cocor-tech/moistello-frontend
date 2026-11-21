import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { PasskeyRevokedBanner } from "../passkey-revoked-banner"

describe("PasskeyRevokedBanner", () => {
  it("renders the alert banner with revoked heading and explanatory copy", () => {
    render(<PasskeyRevokedBanner />)

    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(screen.getByText("Passkey revoked")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Your passkey has been revoked. Please set up a new one to continue."
      )
    ).toBeInTheDocument()
  })

  it("renders a recovery link pointing to /register and an icon graphic", () => {
    const { container } = render(<PasskeyRevokedBanner />)

    const link = screen.getByRole("link", { name: /set up new passkey/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/register")
    expect(container.querySelector("svg")).not.toBeNull()
  })
})
