import { render, screen, fireEvent, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Home, Settings } from "lucide-react"
import { CommandResults } from "../CommandResults"
import type { CommandGroupResult } from "@/hooks/use-command-search"

const homeHit = {
  command: { id: "home", label: "Go home", icon: Home, hint: "G H", run: vi.fn() },
  indices: [],
} as any

const settingsHit = {
  command: { id: "settings", label: "Open settings", icon: Settings, run: vi.fn() },
  indices: [],
} as any

const groups: CommandGroupResult[] = [
  { id: "page", label: "Pages", hits: [homeHit] },
  { id: "action", label: "Actions", hits: [settingsHit] },
]

describe("CommandResults", () => {
  it("shows the loading message when there are no groups and a search is in flight", () => {
    render(
      <CommandResults
        groups={[]}
        activeIndex={0}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        isLoading
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("Loading circles…")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("shows the no-match message when there are no groups and nothing is loading", () => {
    render(
      <CommandResults
        groups={[]}
        activeIndex={0}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        isLoading={false}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("No matching commands")
  })

  it("renders one listbox with labelled groups and marks only the flat active index", () => {
    render(
      <CommandResults
        groups={groups}
        activeIndex={1}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        isLoading={false}
      />,
    )

    const listbox = screen.getByRole("listbox", { name: "Commands" })
    const pages = within(listbox).getByRole("group", { name: "Pages" })
    const actions = within(listbox).getByRole("group", { name: "Actions" })

    const options = within(listbox).getAllByRole("option")
    expect(options).toHaveLength(2)
    expect(within(pages).getByRole("option", { name: /Go home/ })).toHaveAttribute(
      "aria-selected",
      "false",
    )
    expect(within(actions).getByRole("option", { name: /Open settings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  it("reports the flat index of the row that is selected or hovered across group boundaries", () => {
    const onSelect = vi.fn()
    const onHover = vi.fn()
    render(
      <CommandResults
        groups={groups}
        activeIndex={0}
        onSelect={onSelect}
        onHover={onHover}
        isLoading={false}
      />,
    )

    // Handlers live on the inner button, not the <li role="option"> wrapper.
    const settingsButton = within(
      screen.getByRole("option", { name: /Open settings/ }),
    ).getByRole("button")
    fireEvent.mouseMove(settingsButton)
    expect(onHover).toHaveBeenLastCalledWith(1)

    fireEvent.click(settingsButton)
    expect(onSelect).toHaveBeenLastCalledWith(1)
  })
})
