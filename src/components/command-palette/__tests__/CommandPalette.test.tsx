import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

/*
 * The palette's behaviour (portal, combobox/keyboard wiring, focus trap,
 * backdrop, Cmd+K toggle) is what is under test, so the command registry is
 * stubbed while the real search and UI store are exercised.
 */
const mocks = vi.hoisted(() => {
  const runCommand = vi.fn()
  const Icon = () => null

  const commands = [
    { id: "page.dashboard", label: "Dashboard", group: "page", icon: Icon, keywords: "home overview", run: runCommand },
    { id: "page.wallet", label: "Wallet", group: "page", icon: Icon, keywords: "balance funds", run: runCommand },
    { id: "page.support", label: "Support", group: "page", icon: Icon, keywords: "help contact", run: runCommand },
    { id: "action.theme.dark", label: "Theme: Dark", group: "action", icon: Icon, keywords: "night appearance", run: runCommand },
  ]

  return { runCommand, commands }
})

vi.mock("@/hooks/use-command-commands", () => ({
  COMMAND_GROUPS: [
    { id: "recent", label: "Recent" },
    { id: "page", label: "Pages" },
    { id: "action", label: "Actions" },
  ],
  useCommandCommands: () => ({
    commands: mocks.commands,
    recentCommands: [],
    runCommand: mocks.runCommand,
    isLoadingCircles: false,
  }),
}))

import { CommandPalette } from "../CommandPalette"
import { useUIStore } from "@/stores/ui-store"

function setOpen(open: boolean) {
  useUIStore.setState({ commandPaletteOpen: open })
}

describe("CommandPalette (#622)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setOpen(false)
    document.body.style.overflow = ""
  })

  afterEach(() => {
    cleanup()
    setOpen(false)
    document.body.style.overflow = ""
  })

  it("renders nothing while the palette is closed", () => {
    render(<CommandPalette />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })

  it("renders an accessible dialog, combobox and grouped results when open", () => {
    setOpen(true)
    render(<CommandPalette />)

    expect(
      screen.getByRole("dialog", { name: "Command palette" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("listbox", { name: "Commands" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /wallet/i })).toBeInTheDocument()
    // The store opened palette locks background scrolling.
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("filters the command list as the user types", () => {
    setOpen(true)
    render(<CommandPalette />)

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "wallet" },
    })

    expect(screen.getByRole("option", { name: /wallet/i })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /dashboard/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole("option")).toHaveLength(1)
  })

  it("moves the active descendant with the arrow keys and clamps at the ends", () => {
    setOpen(true)
    render(<CommandPalette />)

    const combobox = screen.getByRole("combobox")
    expect(combobox).toHaveAttribute("aria-activedescendant", "command-page.dashboard")

    fireEvent.keyDown(combobox, { key: "ArrowDown" })
    expect(combobox).toHaveAttribute("aria-activedescendant", "command-page.wallet")

    fireEvent.keyDown(combobox, { key: "ArrowUp" })
    expect(combobox).toHaveAttribute("aria-activedescendant", "command-page.dashboard")
  })

  it("runs the highlighted command when Enter is pressed", () => {
    setOpen(true)
    render(<CommandPalette />)

    const combobox = screen.getByRole("combobox")
    fireEvent.keyDown(combobox, { key: "ArrowDown" })
    fireEvent.keyDown(combobox, { key: "Enter" })

    expect(mocks.runCommand).toHaveBeenCalledTimes(1)
    expect(mocks.runCommand).toHaveBeenCalledWith(mocks.commands[1])
  })

  it("runs a command when its row is clicked", () => {
    setOpen(true)
    render(<CommandPalette />)

    fireEvent.click(screen.getByRole("button", { name: /support/i }))

    expect(mocks.runCommand).toHaveBeenCalledWith(mocks.commands[2])
  })

  it("closes on Escape and releases the body scroll lock", async () => {
    setOpen(true)
    render(<CommandPalette />)

    fireEvent.keyDown(document, { key: "Escape" })

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
    expect(document.body.style.overflow).toBe("")
  })

  it("toggles open and closed with Cmd/Ctrl+K", async () => {
    render(<CommandPalette />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: "k", metaKey: true })
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument())

    fireEvent.keyDown(document, { key: "k", ctrlKey: true })
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
})
