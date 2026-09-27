import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../theme-toggle";
import { useUIStore } from "@/stores/ui-store";

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      commandPaletteOpen: false,
      toasts: [],
    });

    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders with accessible label indicating current theme and action", () => {
    useUIStore.setState({ theme: "system" });
    render(<ThemeToggle />);

    const button = screen.getByRole("button", {
      name: /Theme: System \(light\)\. Click to switch to light mode/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("cycles theme on button click", () => {
    useUIStore.setState({ theme: "light" });
    render(<ThemeToggle />);

    const button = screen.getByRole("button", {
      name: /Theme: Light\. Click to switch to dark mode/i,
    });
    fireEvent.click(button);

    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("applies custom size classes and custom className", () => {
    render(<ThemeToggle size="sm" className="custom-test-class" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("h-8");
    expect(button.className).toContain("custom-test-class");
  });

  it("renders with showLabel", () => {
    useUIStore.setState({ theme: "dark" });
    render(<ThemeToggle showLabel />);
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("renders segmented variant and allows direct theme selection", () => {
    useUIStore.setState({ theme: "light" });
    render(<ThemeToggle variant="segmented" />);

    const lightBtn = screen.getByRole("button", { name: /^Light$/i });
    const darkBtn = screen.getByRole("button", { name: /^Dark$/i });
    const systemBtn = screen.getByRole("button", { name: /^System$/i });

    expect(lightBtn).toHaveAttribute("aria-pressed", "true");
    expect(darkBtn).toHaveAttribute("aria-pressed", "false");
    expect(systemBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(darkBtn);
    expect(useUIStore.getState().theme).toBe("dark");

    fireEvent.click(systemBtn);
    expect(useUIStore.getState().theme).toBe("system");
  });

  it("renders dropdown variant and selects theme from menu", () => {
    useUIStore.setState({ theme: "light" });
    render(<ThemeToggle variant="dropdown" />);

    const trigger = screen.getByRole("button", { name: /Theme: Light/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const darkMenuItem = screen.getByRole("menuitem", { name: /^Dark$/i });
    fireEvent.click(darkMenuItem);

    expect(useUIStore.getState().theme).toBe("dark");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes dropdown menu on Escape key", () => {
    render(<ThemeToggle variant="dropdown" />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
