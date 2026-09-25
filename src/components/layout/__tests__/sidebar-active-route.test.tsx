import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "../sidebar";

let currentPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: vi.fn((selector) =>
    selector({
      theme: "light",
      toggleTheme: vi.fn(),
    })
  ),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      user: { displayName: "Alice", moiScore: 100 },
      isAuthenticated: true,
    })
  ),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useUnreadCount: () => 0,
}));

vi.mock("@/lib/locale/context", () => ({
  useTranslate: () => ({
    locale: "en",
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.platform": "Platform",
        "nav.dashboard": "Dashboard",
        "nav.savings": "Savings",
        "nav.circles": "Circles",
        "nav.community": "Community",
        "nav.communities": "Communities",
        "nav.contributions": "Contributions",
        "nav.payouts": "Payouts",
        "nav.account": "Account",
        "nav.notifications": "Notifications",
        "nav.settings": "Settings",
        "nav.wallet": "Wallet",
        "nav.documentation": "Documentation",
        "nav.support": "Support",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("Sidebar active route highlighting (issue #401)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("highlights Dashboard when on root route '/'", () => {
    currentPathname = "/";
    render(<Sidebar />);

    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    const circlesLink = screen.getByRole("link", { name: /Circles/i });
    expect(circlesLink).not.toHaveAttribute("aria-current");
  });

  it("highlights Circles parent when navigating to nested route '/circles/circle-123/settings'", () => {
    currentPathname = "/circles/circle-123/settings";
    render(<Sidebar />);

    const circlesLink = screen.getByRole("link", { name: /Circles/i });
    expect(circlesLink).toHaveAttribute("aria-current", "page");

    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).not.toHaveAttribute("aria-current");
  });

  it("highlights Circles parent when navigating to '/circles/create'", () => {
    currentPathname = "/circles/create";
    render(<Sidebar />);

    const circlesLink = screen.getByRole("link", { name: /Circles/i });
    expect(circlesLink).toHaveAttribute("aria-current", "page");
  });

  it("does NOT highlight Circles on sibling prefix route '/circles-archive'", () => {
    currentPathname = "/circles-archive";
    render(<Sidebar />);

    const circlesLink = screen.getByRole("link", { name: /Circles/i });
    expect(circlesLink).not.toHaveAttribute("aria-current");
  });

  it("highlights Savings when navigating to nested route '/savings/plans/1'", () => {
    currentPathname = "/savings/plans/1";
    render(<Sidebar />);

    const savingsLink = screen.getByRole("link", { name: /Savings/i });
    expect(savingsLink).toHaveAttribute("aria-current", "page");
  });

  it("does NOT highlight Savings on sibling prefix route '/savings-history'", () => {
    currentPathname = "/savings-history";
    render(<Sidebar />);

    const savingsLink = screen.getByRole("link", { name: /Savings/i });
    expect(savingsLink).not.toHaveAttribute("aria-current");
  });
});
