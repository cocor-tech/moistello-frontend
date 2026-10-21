import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LedgerDeviceSim } from "../ledger-device-sim"

describe("LedgerDeviceSim", () => {
  it("renders the simulator frame", () => {
    render(<LedgerDeviceSim screen="dashboard" />)

    const frame = document.querySelector('[class*="w-\[180px\]"]')
    expect(frame).toBeInTheDocument()
  })

  it("renders dashboard screen with Stellar, Bitcoin, Ethereum apps", () => {
    render(<LedgerDeviceSim screen="dashboard" />)

    expect(screen.getAllByText((content) => content.includes("Stellar"))).toHaveLength(2)
    expect(screen.getAllByText((content) => content.includes("Bitcoin"))).toHaveLength(1)
    expect(screen.getAllByText((content) => content.includes("Ethereum"))).toHaveLength(1)
  })

  it("renders stellar logo screen", () => {
    render(<LedgerDeviceSim screen="stellar_logo" />)

    expect(screen.getAllByText((content) => content.includes("Stellar"))).toHaveLength(2)
  })

  it("renders waiting_commands screen", () => {
    render(<LedgerDeviceSim screen="waiting_commands" />)

    expect(screen.getAllByText((content) => content.includes("Stellar"))).toHaveLength(2)
    expect(screen.getByText((content) => content.includes("Stellar app is ready"))).toBeInTheDocument()
  })

  it("renders display_address screen with address", () => {
    render(<LedgerDeviceSim screen="display_address" address="GAAAA...1111" />)

    expect(screen.getByText((content) => content.includes("Address"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("GAAAA...1111"))).toBeInTheDocument()
  })

  it("renders confirm_address screen with address", () => {
    render(<LedgerDeviceSim screen="confirm_address" address="GAAAA...1111" />)

    expect(screen.getByText((content) => content.includes("Address"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("GAAAA...1111"))).toBeInTheDocument()
  })

  it("renders review_transaction screen with amount and asset", () => {
    render(
      <LedgerDeviceSim
        screen="review_transaction"
        amount="100"
        asset="XLM"
        destination="GAAAA...1111"
      />
    )

    expect(screen.getByText((content) => content.includes("Review Tx"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("100 XLM"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("GAAAA...1111"))).toBeInTheDocument()
  })

  it("renders transaction_details screen with operation type", () => {
    render(
      <LedgerDeviceSim
        screen="transaction_details"
        operationType="Create stream"
        amount="100"
        asset="XLM"
      />
    )

    expect(screen.getByText((content) => content.includes("Transaction details"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Create stream"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("100 XLM"))).toBeInTheDocument()
  })

  it("renders signing screen", () => {
    render(<LedgerDeviceSim screen="signing" />)

    expect(screen.getByText((content) => content.toLowerCase().includes("signing"))).toBeInTheDocument()
  })

  it("renders approved screen", () => {
    render(<LedgerDeviceSim screen="approved" />)

    expect(screen.getByText((content) => content.toLowerCase().includes("approved"))).toBeInTheDocument()
  })

  it("renders rejected screen", () => {
    render(<LedgerDeviceSim screen="rejected" />)

    expect(screen.getByText((content) => content.toLowerCase().includes("rejected"))).toBeInTheDocument()
  })

  it("renders bootloader screen", () => {
    render(<LedgerDeviceSim screen="bootloader" />)

    expect(screen.getByText((content) => content.toLowerCase().includes("bootloader"))).toBeInTheDocument()
  })

  it("renders locked screen", () => {
    render(<LedgerDeviceSim screen="locked" />)

    expect(screen.getByText((content) => content.toLowerCase().includes("locked"))).toBeInTheDocument()
  })

  it("renders pairing screen", () => {
    render(<LedgerDeviceSim screen="pairing" />)

    expect(screen.getByText((content) => content.toLowerCase().includes("pairing"))).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(<LedgerDeviceSim screen="dashboard" className="custom-class" />)

    const frame = document.querySelector('[class*="w-\[180px\]"]')
    expect(frame).toHaveClass("custom-class")
  })
})