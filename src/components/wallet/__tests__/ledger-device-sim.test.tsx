/**
 * ledger-device-sim.test.tsx
 *
 * Component tests for <LedgerDeviceSim> covering:
 *  - screen-specific device captions for every DeviceScreenState
 *  - address truncation on display/confirm screens
 *  - transaction review/details rendering with defaults and overrides
 *  - reduced-motion preference disabling the pulse animation
 */

import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  LedgerDeviceSim,
  type DeviceScreenState,
} from "../ledger-device-sim"

const ALL_SCREENS: Array<{ screen: DeviceScreenState; label: string }> = [
  { screen: "dashboard", label: "Your Ledger is on the Dashboard" },
  { screen: "stellar_logo", label: "Opening Stellar app..." },
  { screen: "waiting_commands", label: "Stellar app is ready" },
  { screen: "display_address", label: "Check address on your Ledger" },
  { screen: "confirm_address", label: "Press both buttons to confirm" },
  { screen: "review_transaction", label: "Review on your Ledger" },
  { screen: "transaction_details", label: "Verify details, then sign" },
  { screen: "signing", label: "Signing on Ledger..." },
  { screen: "approved", label: "Transaction signed ✓" },
  { screen: "rejected", label: "Transaction rejected" },
  { screen: "bootloader", label: "Device in bootloader mode" },
  { screen: "locked", label: "Device is locked" },
  { screen: "pairing", label: "Bluetooth pairing request" },
]

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("LedgerDeviceSim", () => {
  it.each(ALL_SCREENS)("renders the caption for the $screen screen", ({ screen: state, label }) => {
    render(<LedgerDeviceSim screen={state} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("truncates a long address on the display_address screen", () => {
    const address = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
    render(<LedgerDeviceSim screen="display_address" address={address} />)
    expect(
      screen.getByText(`${address.slice(0, 14)}...${address.slice(-6)}`)
    ).toBeInTheDocument()
  })

  it("falls back to a placeholder address when none is supplied", () => {
    render(<LedgerDeviceSim screen="confirm_address" />)
    expect(screen.getByText("GABC...XYZ")).toBeInTheDocument()
    expect(screen.getByText("✓ Approve")).toBeInTheDocument()
    expect(screen.getByText("✗ Reject")).toBeInTheDocument()
  })

  it("shows operation, amount and asset on review_transaction with defaults", () => {
    render(<LedgerDeviceSim screen="review_transaction" />)
    expect(screen.getByText("Payment")).toBeInTheDocument()
    expect(screen.getByText("100 XLM")).toBeInTheDocument()
  })

  it("shows overridden operation, amount and asset on review_transaction", () => {
    render(
      <LedgerDeviceSim
        screen="review_transaction"
        operationType="Change Trust"
        amount="250.75"
        asset="USDC"
      />
    )
    expect(screen.getByText("Change Trust")).toBeInTheDocument()
    expect(screen.getByText("250.75 USDC")).toBeInTheDocument()
  })

  it("renders destination, amount and fee on transaction_details", () => {
    const destination = "GDESTINATIONADDRESS1234567890ABCDEFGHIJ"
    render(
      <LedgerDeviceSim
        screen="transaction_details"
        destination={destination}
        amount="42"
        asset="USDC"
      />
    )
    // Details lines share one container split by <br/>, so match on substrings
    expect(
      screen.getByText((content) => content.includes(`Dest: ${destination.slice(0, 8)}...`))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes("Amt: 42 USDC"))
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes("Fee: 0.00001 XLM"))
    ).toBeInTheDocument()
    expect(screen.getByText("✓ Sign")).toBeInTheDocument()
  })

  it("marks the device frame as decorative (aria-hidden)", () => {
    render(<LedgerDeviceSim screen="dashboard" />)
    // The frame div carries aria-hidden so SR users rely on the caption
    const caption = screen.getByText("Your Ledger is on the Dashboard")
    expect(caption).not.toHaveAttribute("aria-hidden")
  })

  it("disables pulse animations when the user prefers reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )

    const { container } = render(<LedgerDeviceSim screen="signing" />)
    const animated = container.querySelectorAll<HTMLElement>(".animate-pulse")
    expect(animated.length).toBeGreaterThan(0)
    animated.forEach((el) => expect(el.style.animation).toBe("none"))
  })

  it("applies a custom className to the outer wrapper", () => {
    const { container } = render(
      <LedgerDeviceSim screen="dashboard" className="my-sim" />
    )
    expect(container.firstElementChild).toHaveClass("my-sim")
  })
})
