import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CommandRow } from "../CommandRow"
import { Home } from "lucide-react"

const hit = {
  command: { id: "home", label: "Go home", icon: Home, hint: "G H" },
  indices: [0, 1],
} as any

describe("CommandRow", () => {
  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn()
    render(<CommandRow hit={hit} isActive={false} onSelect={onSelect} onHover={vi.fn()} />)
    fireEvent.click(screen.getByRole("option"))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
