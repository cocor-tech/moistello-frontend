import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs"

function renderTabs(
  props: Partial<React.ComponentProps<typeof Tabs>> = {},
  content: React.ReactNode = (
    <>
      <TabsTrigger value="one">One</TabsTrigger>
      <TabsTrigger value="two">Two</TabsTrigger>
    </>
  ),
) {
  return render(
    <Tabs defaultValue="one" {...props}>
      <TabsList>{content}</TabsList>
      <TabsContent value="one">Panel one</TabsContent>
      <TabsContent value="two">Panel two</TabsContent>
    </Tabs>,
  )
}

describe("Tabs", () => {
  it("renders the default tab as selected and only its panel", () => {
    renderTabs()

    const tabOne = screen.getByRole("tab", { name: "One" })
    const tabTwo = screen.getByRole("tab", { name: "Two" })

    expect(tabOne).toHaveAttribute("aria-selected", "true")
    expect(tabTwo).toHaveAttribute("aria-selected", "false")
    expect(screen.getByText("Panel one")).toBeInTheDocument()
    expect(screen.queryByText("Panel two")).not.toBeInTheDocument()
  })

  it("wires tab/panel aria relationships and roving tabindex", () => {
    renderTabs()

    const tabOne = screen.getByRole("tab", { name: "One" })
    const tabTwo = screen.getByRole("tab", { name: "Two" })
    const panel = screen.getByRole("tabpanel")

    expect(tabOne).toHaveAttribute("tabindex", "0")
    expect(tabTwo).toHaveAttribute("tabindex", "-1")
    expect(tabOne.getAttribute("aria-controls")).toBe(panel.id)
    expect(panel.getAttribute("aria-labelledby")).toBe(tabOne.id)
  })

  it("switches the active tab and panel on click", () => {
    renderTabs()

    fireEvent.click(screen.getByRole("tab", { name: "Two" }))

    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByText("Panel two")).toBeInTheDocument()
    expect(screen.queryByText("Panel one")).not.toBeInTheDocument()
  })

  it("moves to the next tab with ArrowRight and wraps around", () => {
    renderTabs()

    const tabOne = screen.getByRole("tab", { name: "One" })
    const tabTwo = screen.getByRole("tab", { name: "Two" })

    fireEvent.keyDown(tabOne, { key: "ArrowRight" })
    expect(tabTwo).toHaveAttribute("aria-selected", "true")
    expect(document.activeElement).toBe(tabTwo)

    fireEvent.keyDown(tabTwo, { key: "ArrowRight" })
    expect(tabOne).toHaveAttribute("aria-selected", "true")
    expect(document.activeElement).toBe(tabOne)
  })

  it("moves to the previous tab with ArrowLeft", () => {
    renderTabs()

    const tabOne = screen.getByRole("tab", { name: "One" })
    const tabTwo = screen.getByRole("tab", { name: "Two" })

    fireEvent.keyDown(tabTwo, { key: "ArrowLeft" })
    expect(tabOne).toHaveAttribute("aria-selected", "true")
    expect(document.activeElement).toBe(tabOne)
  })

  it("does not switch tabs for unrelated keys", () => {
    renderTabs()

    fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), { key: "Enter" })

    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByText("Panel one")).toBeInTheDocument()
  })

  it("notifies onValueChange in controlled mode without moving internal state", () => {
    const onValueChange = vi.fn()
    renderTabs({ value: "one", onValueChange })

    fireEvent.click(screen.getByRole("tab", { name: "Two" }))

    expect(onValueChange).toHaveBeenCalledWith("two")
    // Controlled value is still "one" because the parent never updated it.
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByText("Panel one")).toBeInTheDocument()
  })

  it("applies className overrides to the list and trigger", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList className="custom-list">
          <TabsTrigger value="one" className="custom-trigger">
            One
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    )

    expect(screen.getByRole("tablist")).toHaveClass("custom-list")
    expect(screen.getByRole("tab", { name: "One" })).toHaveClass("custom-trigger")
  })

  it("throws when a trigger is rendered outside of a Tabs provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<TabsTrigger value="orphan">Orphan</TabsTrigger>)).toThrow(
      /must be used within a <Tabs>/,
    )
    spy.mockRestore()
  })
})
