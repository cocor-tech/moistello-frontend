import React from "react"
import { act, render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import { OfflineBanner } from "../offline-banner"

describe("OfflineBanner", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    })
  })

  it("returns null when the browser is online", () => {
    const { container } = render(<OfflineBanner />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("renders the offline alert banner when navigator.onLine is false and merges custom className", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    })

    render(<OfflineBanner className="custom-offline-banner" />)

    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveClass("custom-offline-banner")
    expect(
      screen.getByText("You are offline. Please check your connection.")
    ).toBeInTheDocument()
  })

  it("toggles visibility in response to window offline and online events", () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole("alert")).toBeNull()

    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    expect(screen.getByRole("alert")).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
