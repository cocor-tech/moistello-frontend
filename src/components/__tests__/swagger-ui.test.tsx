import React from "react"
import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SwaggerUIPage } from "../swagger-ui"

vi.mock("swagger-ui-react", () => ({
  default: vi.fn((props) => (
    <div data-testid="swagger-ui-instance" data-url={props.url} />
  )),
}))

vi.mock("swagger-ui-react/swagger-ui.css", () => ({}))

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}))

describe("SwaggerUIPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("renders swagger UI and shows warning banner when not authorized", () => {
    render(<SwaggerUIPage />)

    expect(
      screen.getByText(/Fill in the lock icon above with your Bearer token/)
    ).toBeInTheDocument()
    expect(screen.getByTestId("swagger-ui-instance")).toBeInTheDocument()
    expect(screen.getByTestId("swagger-ui-instance")).toHaveAttribute(
      "data-url",
      "/api/swagger"
    )
  })

  it("hides warning banner when valid authorization token is found in localStorage", () => {
    localStorage.setItem(
      "swagger_authorization",
      JSON.stringify({ Authorization: "Bearer test-token-123" })
    )

    render(<SwaggerUIPage />)

    expect(
      screen.queryByText(/Fill in the lock icon above with your Bearer token/)
    ).toBeNull()
    expect(screen.getByTestId("swagger-ui-instance")).toBeInTheDocument()
  })

  it("handles invalid json in localStorage gracefully without crashing", () => {
    localStorage.setItem("swagger_authorization", "invalid-json{")

    render(<SwaggerUIPage />)

    expect(
      screen.getByText(/Fill in the lock icon above with your Bearer token/)
    ).toBeInTheDocument()
  })

  it("updates authorization state when window storage event fires", () => {
    render(<SwaggerUIPage />)

    expect(
      screen.getByText(/Fill in the lock icon above with your Bearer token/)
    ).toBeInTheDocument()

    act(() => {
      localStorage.setItem(
        "swagger_authorization",
        JSON.stringify({ Authorization: "Bearer updated-token" })
      )
      window.dispatchEvent(new Event("storage"))
    })

    expect(
      screen.queryByText(/Fill in the lock icon above with your Bearer token/)
    ).toBeNull()
  })
})
