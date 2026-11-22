import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import React from "react"
import { ConnectedBadge } from "../connected-badge"

describe("ConnectedBadge", () => {
  const defaultProps = {
    walletName: "Freighter Wallet",
    address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  }

  it("renders wallet name and truncated formatted address", () => {
    render(<ConnectedBadge {...defaultProps} />)

    expect(screen.getByText("Freighter Wallet")).toBeInTheDocument()
    expect(screen.getByText("GBBD47...FLA5")).toBeInTheDocument()
  })

  it("renders disconnect button and calls onDisconnect when clicked", () => {
    const handleDisconnect = vi.fn()
    render(
      <ConnectedBadge
        {...defaultProps}
        onDisconnect={handleDisconnect}
      />
    )

    const disconnectBtn = screen.getByRole("button", { name: "Disconnect wallet" })
    expect(disconnectBtn).toBeInTheDocument()

    fireEvent.click(disconnectBtn)
    expect(handleDisconnect).toHaveBeenCalledTimes(1)
  })

  it("does not render disconnect button when onDisconnect is omitted", () => {
    render(<ConnectedBadge {...defaultProps} />)

    expect(screen.queryByRole("button", { name: "Disconnect wallet" })).toBeNull()
  })

  it("applies custom className when provided", () => {
    const { container } = render(
      <ConnectedBadge {...defaultProps} className="custom-test-class" />
    )

    const rootElement = container.firstElementChild as HTMLElement
    expect(rootElement.className).toContain("custom-test-class")
  })
})
