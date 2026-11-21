import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { AuthLayout } from "../auth-layout"

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock Footer component
vi.mock("@/components/layout/footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
}))

describe("AuthLayout", () => {
  it("renders with default title 'Moistello'", () => {
    render(
      <AuthLayout>
        <p>Test content</p>
      </AuthLayout>
    )

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Moistello")
  })

  it("renders with custom title", () => {
    render(
      <AuthLayout title="Custom Title">
        <p>Test content</p>
      </AuthLayout>
    )

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Custom Title")
  })

  it("renders children content", () => {
    render(
      <AuthLayout>
        <div>Test child content</div>
      </AuthLayout>
    )

    expect(screen.getByText("Test child content")).toBeInTheDocument()
  })

  it("renders footer component", () => {
    render(
      <AuthLayout>
        <p>Content</p>
      </AuthLayout>
    )

    expect(screen.getByTestId("footer")).toBeInTheDocument()
  })

  it("renders footer links when provided", () => {
    const footerLinks = [
      { label: "Back", href: "/", text: "Home" },
      { label: "Need help?", href: "/auth/help", text: "Contact" },
    ]

    render(
      <AuthLayout footerLinks={footerLinks}>
        <p>Content</p>
      </AuthLayout>
    )

    expect(screen.getByText("Back")).toBeInTheDocument()
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Need help?")).toBeInTheDocument()
    expect(screen.getByText("Contact")).toBeInTheDocument()
  })

  it("displays arrow icon for non-auth links", () => {
    const footerLinks = [{ label: "Back", href: "/dashboard", text: "Home" }]

    render(
      <AuthLayout footerLinks={footerLinks}>
        <p>Content</p>
      </AuthLayout>
    )

    expect(screen.getByTestId("arrow-left-icon")).toBeInTheDocument()
  })

  it("does not display arrow icon for auth links", () => {
    const footerLinks = [{ label: "Sign Up", href: "/auth/signup", text: "Create Account" }]

    const { container } = render(
      <AuthLayout footerLinks={footerLinks}>
        <p>Content</p>
      </AuthLayout>
    )

    // Arrow icon should not be rendered for /auth links
    expect(screen.queryByTestId("arrow-left-icon")).not.toBeInTheDocument()
  })

  it("does not render footer links section when footerLinks is empty", () => {
    const { container } = render(
      <AuthLayout footerLinks={[]}>
        <p>Content</p>
      </AuthLayout>
    )

    // Check that no link elements are rendered in the footer section
    const links = container.querySelectorAll('a[href]')
    expect(links).toHaveLength(1) // Only the title link
  })

  it("applies custom className prop", () => {
    const { container } = render(
      <AuthLayout className="custom-class">
        <p>Content</p>
      </AuthLayout>
    )

    const authBox = container.querySelector(".glass")
    expect(authBox).toHaveClass("custom-class")
  })

  it("renders title as a link to home", () => {
    const { container } = render(
      <AuthLayout>
        <p>Content</p>
      </AuthLayout>
    )

    const titleLink = screen.getByRole("heading", { level: 1 }).closest("a")
    expect(titleLink).toHaveAttribute("href", "/")
  })
})
