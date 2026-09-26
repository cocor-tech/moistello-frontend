import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CircleInviteModal, parseCSVInput, validateMemberEntry } from "./circle-invite-modal"

describe("CircleInviteModal", () => {
  it("shows a generating placeholder while the code is empty", () => {
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code=""
        copied={false}
        isError={false}
        error=""
        onCopy={vi.fn()}
      />,
    )

    expect(screen.getByText("Generating")).toBeDefined()
  })

  it("shows the code and a copy button once generated", () => {
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="ABC123"
        copied={false}
        isError={false}
        error=""
        onCopy={vi.fn()}
      />,
    )

    expect(screen.getByText("ABC123")).toBeDefined()
    expect(screen.getByRole("button", { name: "Copy Code" })).toBeDefined()
  })

  it("calls onCopy when the copy button is clicked", async () => {
    const user = userEvent.setup()
    const onCopy = vi.fn()
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="ABC123"
        copied={false}
        isError={false}
        error=""
        onCopy={onCopy}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Copy Code" }))
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it("shows an error message when generation failed", () => {
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="error-generating-code"
        copied={false}
        isError
        error="Failed to generate invite code."
        onCopy={vi.fn()}
      />,
    )

    expect(screen.getByText("Failed to generate invite code.")).toBeDefined()
    expect(screen.queryByRole("button", { name: "Copy Code" })).toBeNull()
  })

  describe("Bulk Member Import (CSV)", () => {
    it("switches to the Bulk Import tab when clicked", async () => {
      const user = userEvent.setup()
      render(
        <CircleInviteModal
          isOpen
          onClose={vi.fn()}
          code="ABC123"
          copied={false}
          isError={false}
          error=""
          onCopy={vi.fn()}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Bulk Import (CSV)" }))
      expect(screen.getByText("Upload CSV File")).toBeDefined()
      expect(screen.getByPlaceholderText(/Enter member emails or Stellar addresses/i)).toBeDefined()
    })

    it("parses CSV textarea input with valid emails and Stellar G-addresses", async () => {
      const user = userEvent.setup()
      const stellarAddr = "G" + "A".repeat(55)
      render(
        <CircleInviteModal
          isOpen
          onClose={vi.fn()}
          code="ABC123"
          copied={false}
          isError={false}
          error=""
          onCopy={vi.fn()}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Bulk Import (CSV)" }))
      const textarea = screen.getByPlaceholderText(/Enter member emails or Stellar addresses/i)

      await user.type(textarea, `user1@example.com, ${stellarAddr}\ninvalid-entry`)

      expect(screen.getByTestId("summary-text").textContent).toContain("2 valid entries, 1 invalid")
      expect(screen.getByText("user1@example.com")).toBeDefined()
      expect(screen.getByText(stellarAddr)).toBeDefined()
      expect(screen.getByText("invalid-entry")).toBeDefined()
    })

    it("calls onBulkImport with valid entries on submission", async () => {
      const user = userEvent.setup()
      const onBulkImport = vi.fn()
      const stellarAddr = "G" + "B".repeat(55)
      render(
        <CircleInviteModal
          isOpen
          onClose={vi.fn()}
          code="ABC123"
          copied={false}
          isError={false}
          error=""
          onCopy={vi.fn()}
          onBulkImport={onBulkImport}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Bulk Import (CSV)" }))
      const textarea = screen.getByPlaceholderText(/Enter member emails or Stellar addresses/i)

      await user.type(textarea, `valid@domain.com, ${stellarAddr}, bad-email`)
      await user.click(screen.getByRole("button", { name: "Import Members" }))

      expect(onBulkImport).toHaveBeenCalledTimes(1)
      expect(onBulkImport).toHaveBeenCalledWith(["valid@domain.com", stellarAddr])
    })

    it("disables Import Members button when no valid entries exist", async () => {
      const user = userEvent.setup()
      render(
        <CircleInviteModal
          isOpen
          onClose={vi.fn()}
          code="ABC123"
          copied={false}
          isError={false}
          error=""
          onCopy={vi.fn()}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Bulk Import (CSV)" }))
      const textarea = screen.getByPlaceholderText(/Enter member emails or Stellar addresses/i)
      const importBtn = screen.getByRole("button", { name: "Import Members" })

      expect(importBtn).toHaveProperty("disabled", true)

      await user.type(textarea, "invalid-entry-only")
      expect(importBtn).toHaveProperty("disabled", true)
    })

    it("handles CSV file upload input", async () => {
      const user = userEvent.setup()
      render(
        <CircleInviteModal
          isOpen
          onClose={vi.fn()}
          code="ABC123"
          copied={false}
          isError={false}
          error=""
          onCopy={vi.fn()}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Bulk Import (CSV)" }))
      const fileInput = screen.getByLabelText(/Upload CSV File/i)

      const csvContent = "fileuser@example.com,notanemail"
      const file = new File([csvContent], "test.csv", { type: "text/csv" })

      await user.upload(fileInput, file)

      expect(screen.getByTestId("summary-text").textContent).toContain("1 valid entries, 1 invalid")
      expect(screen.getByText("fileuser@example.com")).toBeDefined()
    })
  })

  describe("Helper validation logic", () => {
    it("correctly validates emails and Stellar G-addresses", () => {
      expect(validateMemberEntry("test@example.com").isValid).toBe(true)
      expect(validateMemberEntry("G" + "C".repeat(55)).isValid).toBe(true)
      expect(validateMemberEntry("invalid-address").isValid).toBe(false)
      expect(validateMemberEntry("Gshort").isValid).toBe(false)
    })

    it("correctly parses CSV strings split by commas and newlines", () => {
      const input = "a@b.com, G" + "D".repeat(55) + "\n\n  c@d.com , invalid"
      const result = parseCSVInput(input)
      expect(result).toHaveLength(4)
      expect(result[0].isValid).toBe(true)
      expect(result[1].isValid).toBe(true)
      expect(result[2].isValid).toBe(true)
      expect(result[3].isValid).toBe(false)
    })
  })
})

