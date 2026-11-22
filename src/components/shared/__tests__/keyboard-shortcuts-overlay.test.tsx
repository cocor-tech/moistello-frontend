import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import React from "react"
import { KeyboardShortcutsOverlay } from "../keyboard-shortcuts-overlay"
import type { Shortcut } from "@/hooks/use-keyboard-shortcuts"

describe("KeyboardShortcutsOverlay", () => {
  const sampleShortcuts: Shortcut[] = [
    {
      key: "?",
      label: "?",
      description: "Show keyboard shortcuts",
      action: vi.fn(),
    },
    {
      key: "k",
      label: "⌘ K",
      description: "Search anything",
      action: vi.fn(),
    },
    {
      key: "g h",
      label: "g h",
      description: "Go to Home",
      action: vi.fn(),
    },
    {
      key: "g e",
      label: "g e",
      description: "Go to Explore",
      action: vi.fn(),
    },
  ]

  it("renders modal with title, actions, and navigation shortcut groups", () => {
    render(
      <KeyboardShortcutsOverlay
        isOpen={true}
        onClose={vi.fn()}
        shortcuts={sampleShortcuts}
      />
    )

    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" })).toBeInTheDocument()
    expect(screen.getByText("Actions")).toBeInTheDocument()
    expect(screen.getByText("Navigation")).toBeInTheDocument()

    // Action shortcuts
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument()
    expect(screen.getByText("Search anything")).toBeInTheDocument()

    // Navigation shortcuts (starting with 'g ')
    expect(screen.getByText("Go to Home")).toBeInTheDocument()
    expect(screen.getByText("Go to Explore")).toBeInTheDocument()

    // Multi-key split indicator 'then'
    expect(screen.getAllByText("then").length).toBeGreaterThan(0)
  })

  it("renders empty groups gracefully when no shortcuts are provided", () => {
    render(
      <KeyboardShortcutsOverlay
        isOpen={true}
        onClose={vi.fn()}
        shortcuts={[]}
      />
    )

    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" })).toBeInTheDocument()
    expect(screen.getByText("Actions")).toBeInTheDocument()
    expect(screen.getByText("Navigation")).toBeInTheDocument()
  })

  it("does not render dialog content when isOpen is false", () => {
    render(
      <KeyboardShortcutsOverlay
        isOpen={false}
        onClose={vi.fn()}
        shortcuts={sampleShortcuts}
      />
    )

    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
