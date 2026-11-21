import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MobileNav } from "../mobile-nav"

let currentPathname = "/"

const translations: Record<string, string> = {
  "nav.dashboard": "Dashboard",
  "nav.savings": "Savings",
  "nav.circles": "Circles",
  "nav.communities": "Communities",
  "nav.profile": "Profile",
}

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}))

vi.mock("@/lib/locale/context", () => ({
  useTranslate: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}))

describe("MobileNav", () => {
  beforeEach(() => {
    currentPathname = "/"
  })

  it("renders all primary navigation links with translated labels", () => {
    render(<MobileNav />)

    const nav = screen.getByRole("navigation", {
      name: "Mobile dashboard navigation",
    })
    expect(nav).toBeInTheDocument()

    const expectedLinks = [
      { label: "Dashboard", href: "/" },
      { label: "Savings", href: "/savings" },
      { label: "Circles", href: "/circles" },
      { label: "Communities", href: "/communities" },
      { label: "Profile", href: "/profile" },
    ]

    for (const link of expectedLinks) {
      const element = screen.getByRole("link", { name: link.label })
      expect(element).toHaveAttribute("href", link.href)
    }
  })

  it("marks only the exact dashboard route as active", () => {
    render(<MobileNav />)

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "Savings" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("marks a parent item active on nested routes", () => {
    currentPathname = "/circles/circle-123/settings"
    render(<MobileNav />)

    expect(screen.getByRole("link", { name: "Circles" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("does not mark an item active on sibling-prefixed routes", () => {
    currentPathname = "/savings-archive"
    render(<MobileNav />)

    expect(screen.getByRole("link", { name: "Savings" })).not.toHaveAttribute(
      "aria-current"
    )
  })
})
