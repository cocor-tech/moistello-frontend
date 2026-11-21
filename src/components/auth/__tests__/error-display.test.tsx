import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ErrorDisplay } from "../error-display"
import type { AuthErrorCode } from "@/stores/auth-flow-store"

describe("ErrorDisplay", () => {
  it("renders nothing when there is neither a code nor a message", () => {
    const { container } = render(<ErrorDisplay code={null} message={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the friendly label for a known error code", () => {
    render(
      <ErrorDisplay
        code={"relay_down" as AuthErrorCode}
        message="The relay is not reachable."
      />
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Relay Unavailable")
    expect(alert).toHaveTextContent("The relay is not reachable.")
  })

  it("falls back to a generic label for an unknown error code", () => {
    render(
      <ErrorDisplay code={"something_new" as AuthErrorCode} message="Details here" />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Error")
  })

  it("shows the generic label when only a message is given", () => {
    render(<ErrorDisplay code={null} message="Only a message" />)
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Error")
    expect(alert).toHaveTextContent("Only a message")
  })

  it("does not render a message paragraph when the message is empty", () => {
    render(<ErrorDisplay code={"network_mismatch" as AuthErrorCode} message={null} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Network Mismatch")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows Retry only when canRetry is set and onRetry is given", () => {
    const onRetry = vi.fn()
    render(
      <ErrorDisplay
        code={"connection_timeout" as AuthErrorCode}
        message="Timed out"
        canRetry
        onRetry={onRetry}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("hides Retry when canRetry is false even if onRetry is given", () => {
    render(
      <ErrorDisplay
        code={"connection_timeout" as AuthErrorCode}
        message="Timed out"
        canRetry={false}
        onRetry={() => {}}
      />
    )
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument()
  })

  it("hides Retry when canRetry is set but no handler is given", () => {
    render(
      <ErrorDisplay code={"auth_server_error" as AuthErrorCode} message="Server" canRetry />
    )
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument()
  })
})
