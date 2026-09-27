import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ThemeProvider } from "../theme-provider";
import { useUIStore } from "@/stores/ui-store";

describe("ThemeProvider", () => {
  type MatchMediaListener = (e: { matches: boolean }) => void;
  let listeners: MatchMediaListener[] = [];
  let matchesDark = false;

  beforeEach(() => {
    listeners = [];
    matchesDark = false;
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";

    useUIStore.setState({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      commandPaletteOpen: false,
      toasts: [],
    });

    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === "(prefers-color-scheme: dark)" ? matchesDark : false;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: MatchMediaListener) => {
        listeners.push(listener);
      }),
      removeEventListener: vi.fn((_type: string, listener: MatchMediaListener) => {
        listeners = listeners.filter((l) => l !== listener);
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies dark class and attributes when theme is dark", () => {
    useUIStore.setState({ theme: "dark" });
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("removes dark class and sets light attributes when theme is light", () => {
    document.documentElement.classList.add("dark");
    useUIStore.setState({ theme: "light" });
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("detects system dark preference when theme is system", () => {
    matchesDark = true;
    useUIStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("detects system light preference when theme is system", () => {
    matchesDark = false;
    useUIStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("updates DOM when system preference changes and theme is system", () => {
    matchesDark = false;
    useUIStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => {
      matchesDark = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
