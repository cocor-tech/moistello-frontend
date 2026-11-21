import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { BackupCodes } from "../backup-codes"
import * as clipboard from "@/lib/clipboard"

describe("BackupCodes", () => {
  const mockCodes = ["ABCD-1234", "EFGH-5678", "IJKL-9012", "MNOP-3456"]
  const mockOnAcknowledged = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders heading warning and all backup codes", () => {
    render(<BackupCodes codes={mockCodes} onAcknowledged={mockOnAcknowledged} />)

    expect(screen.getByText("Save Your Backup Codes")).toBeInTheDocument()
    expect(
      screen.getByText(/Each code can be used/i)
    ).toBeInTheDocument()

    mockCodes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument()
    })
  })

  it("calls onAcknowledged when 'I've Saved My Codes — Continue' is clicked", () => {
    render(<BackupCodes codes={mockCodes} onAcknowledged={mockOnAcknowledged} />)

    const continueButton = screen.getByRole("button", {
      name: /I've Saved My Codes — Continue/i,
    })
    fireEvent.click(continueButton)

    expect(mockOnAcknowledged).toHaveBeenCalledTimes(1)
  })

  it("handles successful copy and shows 'Copied!' feedback", async () => {
    const copySpy = vi.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true)

    render(<BackupCodes codes={mockCodes} onAcknowledged={mockOnAcknowledged} />)

    const copyButton = screen.getByRole("button", { name: /^Copy$/i })
    fireEvent.click(copyButton)

    expect(copySpy).toHaveBeenCalledWith(mockCodes.join("
"))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied!/i })).toBeInTheDocument()
    })
  })

  it("handles copy failure and shows 'Failed to Copy' feedback", async () => {
    const copySpy = vi.spyOn(clipboard, "copyToClipboard").mockResolvedValue(false)

    render(<BackupCodes codes={mockCodes} onAcknowledged={mockOnAcknowledged} />)

    const copyButton = screen.getByRole("button", { name: /^Copy$/i })
    fireEvent.click(copyButton)

    expect(copySpy).toHaveBeenCalledWith(mockCodes.join("
"))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /failed to copy/i })).toBeInTheDocument()
    })
  })

  it("handles download, creates blob URL, triggers download, and updates button label", () => {
    const createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url")
    const revokeObjectURLSpy = vi.fn()
    window.URL.createObjectURL = createObjectURLSpy
    window.URL.revokeObjectURL = revokeObjectURLSpy

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    render(<BackupCodes codes={mockCodes} onAcknowledged={mockOnAcknowledged} />)

    const downloadButton = screen.getByRole("button", { name: /^Download$/i })
    fireEvent.click(downloadButton)

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url")

    expect(screen.getByRole("button", { name: /downloaded/i })).toBeInTheDocument()
  })
})
