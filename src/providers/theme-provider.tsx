"use client";

import { useEffect, type ReactNode } from "react";
import { useUIStore } from "@/stores/ui-store";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useUIStore((s) => s.theme);
  const density = useUIStore((s) => s.density);
  const fontSize = useUIStore((s) => s.fontSize);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (current: string) => {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = current === "dark" || (current === "system" && prefersDark);
      const resolved = isDark ? "dark" : "light";

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
    };

    applyTheme(theme);

    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const activeTheme = useUIStore.getState().theme;
      if (activeTheme === "system") {
        applyTheme("system");
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (typeof (mediaQuery as { addListener?: (fn: () => void) => void }).addListener === "function") {
      (mediaQuery as { addListener: (fn: () => void) => void }).addListener(handleChange);
      return () =>
        (mediaQuery as { removeListener: (fn: () => void) => void }).removeListener(handleChange);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  return <>{children}</>;
}
