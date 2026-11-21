import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { WalletGrid } from "../wallet-grid"

const detectedFreighter = {
  id: "freighter",
  name: "Freighter",
  category: "extension",
  icon: <span data-testid="icon-freighter">F</span>,
  description: "Browser extension",
  isRecommended: true,
  status: "detected" as const,
}

const detectedAlbedo = {
  id: "albedo",
  name: "Albedo",
  category: "web",
  icon: <span data-testid="icon-albedo">A</span>,
  description: "Web wallet",
  status: "detected" as const,
}

const undetectedLedger = {
  id: "ledger",
  name: "Ledger",
  category: "hardware",
  icon: <span data-testid="icon-ledger">L</span>,
  description: "Hardware wallet",
  status: "not_detected" as const,
}

describe("WalletGrid", () => {
  it("returns null when wallets array is empty", () => {
    const { container } = render(
      <WalletGrid wallets={[]} connectingWalletId={null} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders wallet cards and calls onSelect with the clicked wallet id", () => {
    const onSelect = vi.fn()
    const { container } = render(
      <WalletGrid
        wallets={[detectedFreighter, detectedAlbedo, undetectedLedger]}
        connectingWalletId={null}
        onSelect={onSelect}
        className="extra-grid"
      />
    )

    const grid = container.firstElementChild as HTMLElement
    expect(grid.className).toContain("grid-cols-2")
    expect(grid.className).toContain("extra-grid")

    const freighterBtn = screen.getByRole("button", { name: /Freighter/i })
    const ledgerBtn = screen.getByRole("button", { name: /Ledger/i })

    expect(freighterBtn).not.toBeDisabled()
    expect(ledgerBtn).toBeDisabled()

    fireEvent.click(freighterBtn)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith("freighter")

    fireEvent.click(ledgerBtn)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("disables all cards and marks the connecting wallet when connectingWalletId is set", () => {
    const onSelect = vi.fn()
    render(
      <WalletGrid
        wallets={[detectedFreighter, detectedAlbedo]}
        connectingWalletId="freighter"
        onSelect={onSelect}
      />
    )

    const freighterBtn = screen.getByRole("button", { name: /Freighter/i })
    const albedoBtn = screen.getByRole("button", { name: /Albedo/i })

    expect(freighterBtn).toBeDisabled()
    expect(albedoBtn).toBeDisabled()
    expect(freighterBtn.className).toContain("animate-pulse")
    expect(albedoBtn.className).not.toContain("animate-pulse")

    fireEvent.click(albedoBtn)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
