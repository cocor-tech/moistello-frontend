import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

let currentPathname = "/"

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}))

import { AutoBreadcrumbs } from "../auto-breadcrumbs"

function renderAt(
  pathname: string,
  props: { maxVisible?: number; className?: string } = {},
) {
  currentPathname = pathname
  return render(<AutoBreadcrumbs {...props} />)
}

describe("AutoBreadcrumbs (#623)", () => {
  it("renders a breadcrumb navigation with a home link on the dashboard root", () => {
    renderAt("/")

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "House" }).length).toBeGreaterThan(0)
    for (const link of screen.getAllByRole("link", { name: "House" })) {
      expect(link).toHaveAttribute("href", "/")
    }
    expect(screen.getByText("Dashboard")).toHaveAttribute("aria-current", "page")
  })

  it("maps known segments to friendly labels and links intermediate crumbs to their parent", () => {
    renderAt("/wallet/transactions")

    expect(screen.getByRole("link", { name: "Wallet" })).toHaveAttribute(
      "href",
      "/wallet",
    )
    expect(screen.getByText("Transactions")).toHaveAttribute("aria-current", "page")
  })

  it("uses the routeParents override for nested known routes", () => {
    renderAt("/circles/saved/detail")

    expect(screen.getByRole("link", { name: "Circles" })).toHaveAttribute(
      "href",
      "/circles",
    )
    expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute(
      "href",
      "/circles/saved",
    )
    expect(screen.getByText("Detail")).toHaveAttribute("aria-current", "page")
  })

  it("skips dynamic [param] segments", () => {
    renderAt("/circles/[id]/members")

    expect(screen.queryByText("[id]")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Circles" })).toHaveAttribute(
      "href",
      "/circles",
    )
    expect(screen.getByText("Members")).toHaveAttribute("aria-current", "page")
  })

  it("capitalizes unknown segments and falls back to the built path for their href", () => {
    renderAt("/frobnicate/extra")

    expect(screen.getByRole("link", { name: "Frobnicate" })).toHaveAttribute(
      "href",
      "/frobnicate",
    )
    expect(screen.getByText("Extra")).toHaveAttribute("aria-current", "page")
  })

  it("collapses the middle of long trails behind an ellipsis, honouring maxVisible", () => {
    renderAt("/circles/one/two/three", { maxVisible: 4 })

    // Built trail is House, Circles, One, Two, Three (5) > maxVisible 4,
    // so the middle collapses: Circles is dropped and the ellipsis is drawn
    // as a chevron placeholder (aria-hidden, no "..." text in the DOM).
    expect(screen.queryByText("Circles")).not.toBeInTheDocument()
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.getByText("Two")).toBeInTheDocument()
    expect(screen.getByText("Three")).toHaveAttribute("aria-current", "page")
  })

  it("does not collapse trails within maxVisible", () => {
    renderAt("/circles/one/two")

    // All built crumbs are present, so nothing was dropped.
    expect(screen.getByText("Circles")).toBeInTheDocument()
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.getByText("Two")).toHaveAttribute("aria-current", "page")
  })

  it("applies the className to the nav element", () => {
    renderAt("/", { className: "mt-4 px-2" })

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveClass(
      "mt-4",
      "px-2",
    )
  })
})
