import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { Footer } from "../footer";

describe("Footer component (#48)", () => {
  it("renders the Moistello logo linking to home", () => {
    render(<Footer />);
    const logoLink = screen.getByRole("link", { name: /moistello/i });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders all required navigation links", () => {
    render(<Footer />);
    const nav = screen.getByRole("navigation", { name: /footer navigation/i });
    expect(nav).toBeInTheDocument();

    const expectedLinks = [
      { name: /about/i, href: "/about" },
      { name: /how it works/i, href: "/how-it-works" },
      { name: /developers/i, href: "/developers" },
      { name: /docs/i, href: "/docs" },
      { name: /faq/i, href: "/faq" },
      { name: /support/i, href: "/support" },
      { name: /terms/i, href: "/terms" },
      { name: /privacy/i, href: "/privacy" },
    ];

    for (const link of expectedLinks) {
      const el = screen.getByRole("link", { name: link.name });
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute("href", link.href);
    }
  });

  it("renders social links with secure external attributes", () => {
    render(<Footer />);
    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink).toHaveAttribute("href", "https://github.com/cocor-tech/moistello-frontend");
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");

    const twitterLink = screen.getByRole("link", { name: "X (Twitter)" });
    expect(twitterLink).toHaveAttribute("href", "https://x.com/nekwasar");
    expect(twitterLink).toHaveAttribute("target", "_blank");
    expect(twitterLink).toHaveAttribute("rel", "noopener noreferrer");

    const discordLink = screen.getByRole("link", { name: "Discord" });
    expect(discordLink).toHaveAttribute("href", "https://discord.gg/moistello");
    expect(discordLink).toHaveAttribute("target", "_blank");
    expect(discordLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders copyright and built on stellar badge", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${currentYear} Moistello`, "i"))).toBeInTheDocument();
    expect(screen.getByText(/built on stellar/i)).toBeInTheDocument();
  });

  it("applies glass design styling and contentinfo role", () => {
    const { container } = render(<Footer className="custom-test-class" />);
    const footerElement = container.querySelector("footer");
    expect(footerElement).toBeInTheDocument();
    expect(footerElement).toHaveAttribute("role", "contentinfo");
    expect(footerElement?.className).toContain("glass");
    expect(footerElement?.className).toContain("custom-test-class");
  });
});
