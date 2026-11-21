import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { SecurityWarning } from "../security-warnings"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  TriangleAlert: () => <div data-testid="triangle-alert-icon" />,
  ShieldAlert: () => <div data-testid="shield-alert-icon" />,
  Info: () => <div data-testid="info-icon" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right-icon" />,
}))

describe("SecurityWarning", () => {
  it("renders danger type warning with correct icon and styles", () => {
    const { container } = render(
      <SecurityWarning
        type="danger"
        title="Security Risk"
        message="Your account is at risk"
      />
    )

    expect(screen.getByTestId("shield-alert-icon")).toBeInTheDocument()
    expect(screen.getByText("Security Risk")).toBeInTheDocument()
    expect(screen.getByText("Your account is at risk")).toBeInTheDocument()

    const warningBox = container.querySelector(".border")
    expect(warningBox).toHaveClass("border-red-500/25")
    expect(warningBox).toHaveClass("bg-red-500/8")
  })

  it("renders warning type warning with correct icon and styles", () => {
    const { container } = render(
      <SecurityWarning
        type="warning"
        title="Warning"
        message="Check your settings"
      />
    )

    expect(screen.getByTestId("triangle-alert-icon")).toBeInTheDocument()
    expect(screen.getByText("Warning")).toBeInTheDocument()
    expect(screen.getByText("Check your settings")).toBeInTheDocument()

    const warningBox = container.querySelector(".border")
    expect(warningBox).toHaveClass("border-amber-500/25")
    expect(warningBox).toHaveClass("bg-amber-500/8")
  })

  it("renders info type warning with correct icon and styles", () => {
    const { container } = render(
      <SecurityWarning
        type="info"
        title="Information"
        message="This is informational"
      />
    )

    expect(screen.getByTestId("info-icon")).toBeInTheDocument()
    expect(screen.getByText("Information")).toBeInTheDocument()
    expect(screen.getByText("This is informational")).toBeInTheDocument()

    const warningBox = container.querySelector(".border")
    expect(warningBox).toHaveClass("border-aurora-violet/25")
    expect(warningBox).toHaveClass("bg-aurora-violet/8")
  })

  it("renders action button when provided", () => {
    const handleAction = vi.fn()

    render(
      <SecurityWarning
        type="danger"
        title="Action Needed"
        message="Please take action"
        action={{ label: "Fix Now", onClick: handleAction }}
      />
    )

    const button = screen.getByText("Fix Now")
    expect(button).toBeInTheDocument()
    expect(screen.getByTestId("arrow-up-right-icon")).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleAction).toHaveBeenCalledOnce()
  })

  it("does not render action button when action is not provided", () => {
    render(
      <SecurityWarning
        type="warning"
        title="No Action"
        message="No action available"
      />
    )

    expect(screen.queryByTestId("arrow-up-right-icon")).not.toBeInTheDocument()
  })

  it("applies custom className prop", () => {
    const { container } = render(
      <SecurityWarning
        type="info"
        title="Test"
        message="Test message"
        className="custom-warning-class"
      />
    )

    const warningBox = container.querySelector(".border")
    expect(warningBox).toHaveClass("custom-warning-class")
  })

  it("renders title with correct font styling", () => {
    render(
      <SecurityWarning
        type="danger"
        title="Bold Title"
        message="Message"
      />
    )

    const title = screen.getByText("Bold Title")
    expect(title).toHaveClass("text-sm", "font-semibold")
  })

  it("renders message with correct font styling", () => {
    render(
      <SecurityWarning
        type="warning"
        title="Title"
        message="Small message"
      />
    )

    const message = screen.getByText("Small message")
    expect(message).toHaveClass("text-xs", "leading-relaxed")
  })

  it("renders action button with arrow icon", () => {
    const { container } = render(
      <SecurityWarning
        type="info"
        title="Title"
        message="Message"
        action={{ label: "Learn More", onClick: () => {} }}
      />
    )

    const button = screen.getByText("Learn More")
    expect(button).toHaveClass("inline-flex", "items-center", "gap-1")
    expect(button.querySelector('[data-testid="arrow-up-right-icon"]')).toBeInTheDocument()
  })
})
