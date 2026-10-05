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
        inviteUrl="https://moistello.app/invite/ABC123"
        expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
        ttlHours={24}
        isError={false}
        error=""
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
        inviteUrl="https://moistello.app/invite/ABC123"
        expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
        ttlHours={24}
        isError={false}
        error=""
      />,
    )

    expect(screen.getByText("ABC123")).toBeDefined()
    expect(screen.getByRole("button", { name: /copy invite link/i })).toBeDefined()
  })

  it("copies the full invite link, not the bare code", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    // navigator.clipboard is a getter-only accessor, so it has to be redefined
    // rather than assigned.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })

    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="ABC123"
        inviteUrl="https://moistello.app/invite/ABC123"
        expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
        ttlHours={24}
        isError={false}
        error=""
      />,
    )

    await user.click(screen.getByRole("button", { name: /copy invite link/i }))

    // The full URL is the only artefact a recipient can actually use.
    expect(writeText).toHaveBeenCalledWith("https://moistello.app/invite/ABC123")
  })

  it("shows the live link and a countdown once generated", () => {
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="ABC123"
        inviteUrl="https://moistello.app/invite/ABC123"
        expiresAt={new Date(Date.now() + 2 * 3_600_000 + 30 * 60_000).toISOString()}
        ttlHours={2}
        isError={false}
        error=""
      />,
    )

    expect(screen.getByTestId("invite-link")).toHaveTextContent(
      "https://moistello.app/invite/ABC123",
    )
    // Set 2h30m out, so the floored remainder reads 2h29m.
    expect(screen.getByTestId("invite-expiry")).toHaveTextContent(/2h 29m/)
    expect(screen.getByTestId("invite-expiry")).toHaveTextContent("2h after creation")
  })

  it("says the invite is expired once the countdown reaches zero", () => {
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="ABC123"
        inviteUrl="https://moistello.app/invite/ABC123"
        expiresAt={new Date(Date.now() - 1_000).toISOString()}
        ttlHours={24}
        isError={false}
        error=""
      />,
    )

    expect(screen.getByTestId("invite-expiry")).toHaveTextContent("Expired")
  })

  it("shows an error message when generation failed", () => {
    render(
      <CircleInviteModal
        isOpen
        onClose={vi.fn()}
        code="error-generating-code"
        inviteUrl="https://moistello.app/invite/ABC123"
        expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
        ttlHours={24}
        isError
        error="Failed to generate invite code."
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
          inviteUrl="https://moistello.app/invite/ABC123"
          expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
          ttlHours={24}
          isError={false}
          error=""
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
          inviteUrl="https://moistello.app/invite/ABC123"
          expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
          ttlHours={24}
          isError={false}
          error=""
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
          inviteUrl="https://moistello.app/invite/ABC123"
          expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
          ttlHours={24}
          isError={false}
          error=""
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
          inviteUrl="https://moistello.app/invite/ABC123"
          expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
          ttlHours={24}
          isError={false}
          error=""
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
          inviteUrl="https://moistello.app/invite/ABC123"
          expiresAt={new Date(Date.now() + 24 * 3_600_000).toISOString()}
          ttlHours={24}
          isError={false}
          error=""
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

