import React, { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"
import { AuthInput } from "../auth-input"

describe("AuthInput", () => {
  it("renders with proper label and default attributes", () => {
    render(<AuthInput label="Email Address" placeholder="you@example.com" />)

    const label = screen.getByText("Email Address")
    const input = screen.getByPlaceholderText("you@example.com")

    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("id", "auth-input-email-address")
    expect(label).toHaveAttribute("for", "auth-input-email-address")
    expect(input).toHaveAttribute("autocomplete", "off")
    expect(input).toHaveAttribute("aria-invalid", "false")
  })

  it("uses custom id when provided and applies autocomplete mapping", () => {
    render(
      <AuthInput
        label="Country"
        id="custom-country-id"
        autoCompleteType="country"
      />
    )

    const input = screen.getByLabelText("Country")
    expect(input).toHaveAttribute("id", "custom-country-id")
    expect(input).toHaveAttribute("autocomplete", "country-name")
  })

  it("disables spellCheck when autoCompleteType is name", () => {
    render(<AuthInput label="Full Name" autoCompleteType="name" />)

    const input = screen.getByLabelText("Full Name")
    expect(input).toHaveAttribute("autocomplete", "name")
    expect(input).toHaveAttribute("spellcheck", "false")
  })

  it("renders error message and aria attributes when error is provided", () => {
    render(
      <AuthInput
        label="Password"
        error="Password must be at least 8 characters"
      />
    )

    const input = screen.getByLabelText("Password")
    const errorAlert = screen.getByRole("alert")

    expect(errorAlert).toBeInTheDocument()
    expect(errorAlert).toHaveTextContent("Password must be at least 8 characters")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAttribute("aria-describedby", "auth-input-password-error")
  })

  it("forwards ref to the underlying HTML input element", () => {
    const ref = createRef<HTMLInputElement>()
    render(<AuthInput ref={ref} label="Username" />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.id).toBe("auth-input-username")
  })

  it("accepts user typing and triggers onChange handler", async () => {
    const user = userEvent.setup()
    render(<AuthInput label="Search" />)

    const input = screen.getByLabelText("Search")
    await user.type(input, "Hello world")
    expect(input).toHaveValue("Hello world")
  })
})
