import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AuthWalletCard } from "../auth-wallet-card"

const detectedWallet = {
  id: "freighter",
  name: "Freighter",
  category: "browser",
  icon: <span data-testid="wallet-icon">F</span>,
  description: "Browser extension",
  status: "detected" as const,
}

describe("AuthWalletCard", () => {
  it("renders the wallet name, description and icon, and calls onSelect when a detected wallet is clicked", () => {
    const onSelect = vi.fn()
    render(<AuthWalletCard wallet={detectedWallet} onSelect={onSelect} />)

    const button = screen.getByRole("button", { name: /Freighter/ })
    expect(button).toBeEnabled()
    expect(screen.getByText("Browser extension")).toBeInTheDocument()
    expect(screen.getByTestId("wallet-icon")).toBeInTheDocument()

    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("disables the card and does not select it when the wallet is not installed", () => {
    const onSelect = vi.fn()
    render(
      <AuthWalletCard
        wallet={{ ...detectedWallet, status: "not_detected" }}
        onSelect={onSelect}
      />,
    )

    const button = screen.getByRole("button", { name: /Freighter/ })
    expect(button).toBeDisabled()
    expect(screen.getByText("Not installed")).toBeInTheDocument()

    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("shows the recommended badge and blocks selection while a connection is in progress", () => {
    const onSelect = vi.fn()
    const { container } = render(
      <AuthWalletCard
        wallet={{ ...detectedWallet, isRecommended: true }}
        state="connecting"
        isConnecting
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText("Recommended")).toBeInTheDocument()
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
