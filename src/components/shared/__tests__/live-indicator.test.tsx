import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LiveIndicator } from "../live-indicator"
import type { WsConnectionState } from "@/hooks/use-websocket"

describe("LiveIndicator", () => {
  it("renders with connected state showing Live label", () => {
    render(<LiveIndicator connectionState="connected" />)

    expect(screen.getByText("Live")).toBeInTheDocument()
    const statusElement = screen.getByRole("status")
    expect(statusElement).toHaveAttribute("aria-label", "Real-time updates active")
    expect(statusElement).toHaveAttribute("aria-live", "polite")
  })

  it("renders with polling state showing Polling label", () => {
    render(<LiveIndicator connectionState="polling" />)

    expect(screen.getByText("Polling")).toBeInTheDocument()
    const statusElement = screen.getByRole("status")
    expect(statusElement).toHaveAttribute("aria-label", "Polling for updates every 30 seconds")
  })

  it("renders with disconnected state showing Offline label", () => {
    render(<LiveIndicator connectionState="disconnected" />)

    expect(screen.getByText("Offline")).toBeInTheDocument()
    const statusElement = screen.getByRole("status")
    expect(statusElement).toHaveAttribute("aria-label", "Offline — updates paused")
  })

  it("renders with connecting state showing Offline label", () => {
    render(<LiveIndicator connectionState="connecting" />)

    expect(screen.getByText("Offline")).toBeInTheDocument()
    const statusElement = screen.getByRole("status")
    expect(statusElement).toHaveAttribute("aria-label", "Connecting…")
  })

  it("applies custom className prop", () => {
    const { container } = render(
      <LiveIndicator connectionState="connected" className="custom-class" />
    )

    const span = container.querySelector("span")
    expect(span).toHaveClass("custom-class")
  })

  it("renders with hidden indicator dot", () => {
    const { container } = render(<LiveIndicator connectionState="connected" />)

    const dot = container.querySelector("[aria-hidden='true']")
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass("h-2", "w-2", "rounded-full")
  })

  it("handles invalid connection states gracefully", () => {
    render(<LiveIndicator connectionState={"invalid" as WsConnectionState} />)

    // Should fall back to 'connecting' state config
    expect(screen.getByText("Offline")).toBeInTheDocument()
    const statusElement = screen.getByRole("status")
    expect(statusElement).toHaveAttribute("aria-label", "Connecting…")
  })
})
