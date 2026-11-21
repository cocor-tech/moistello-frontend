import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AuthErrorBoundary } from "../auth-error-boundary"

describe("AuthErrorBoundary", () => {
  it("renders nothing when there is no error", () => {
    const { container } = render(<AuthErrorBoundary error={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when the code is missing", () => {
    const { container } = render(
      <AuthErrorBoundary error={{ code: null, message: "Something" }} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when the message is missing", () => {
    const { container } = render(
      <AuthErrorBoundary error={{ code: "relay_down", message: null }} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the code with underscores as spaces and the message in an alert", () => {
    render(
      <AuthErrorBoundary
        error={{ code: "connection_timeout", message: "The relay did not answer." }}
      />
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("connection timeout")
    expect(alert).toHaveTextContent("The relay did not answer.")
  })

  it("renders no action buttons when neither handler is given", () => {
    render(<AuthErrorBoundary error={{ code: "internal_error", message: "Boom" }} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("calls onRetry and onBack when their buttons are clicked", () => {
    const onRetry = vi.fn()
    const onBack = vi.fn()
    render(
      <AuthErrorBoundary
        error={{ code: "validation_error", message: "Bad input" }}
        onRetry={onRetry}
        onBack={onBack}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /retry/i }))
    fireEvent.click(screen.getByRole("button", { name: /back/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("shows only the Retry button when only onRetry is given", () => {
    render(
      <AuthErrorBoundary
        error={{ code: "relay_down", message: "Down" }}
        onRetry={() => {}}
      />
    )
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument()
  })
})
