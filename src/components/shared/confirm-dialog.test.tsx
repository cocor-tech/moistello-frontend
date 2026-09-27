import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ConfirmDialog } from "./confirm-dialog"

describe("ConfirmDialog", () => {
  it("exposes the action title and description to assistive technology", () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete wallet"
        message="This action cannot be undone."
      />,
    )

    expect(screen.getByRole("dialog", { name: "Delete wallet" })).toHaveAccessibleDescription("This action cannot be undone.")
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument()
  })
})
