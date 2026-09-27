"use client";

import { useEffect, useState, useCallback } from "react";
import { useUIStore, type Theme } from "@/stores/ui-store";

export type ResolvedTheme = "light" | "dark";

export interface UseThemeReturn {
  /** The stored theme setting: 'light' | 'dark' | 'system' */
  theme: Theme;
  /** The currently applied theme after resolving system preference: 'light' | 'dark' */
  resolvedTheme: ResolvedTheme;
  /** The detected system color scheme preference: 'light' | 'dark' */
  systemTheme: ResolvedTheme;
  /** True when the active theme is dark */
  isDark: boolean;
  /** True once client-side hydration has completed */
  mounted: boolean;
  /** Set the theme manually to light, dark, or system */
  setTheme: (theme: Theme) => void;
  /** Cycle through themes: light -> dark -> system */
  toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const theme = useUIStore((s) => s?.theme) ?? "system";
  const storeSetTheme = useUIStore((s) => s?.setTheme);
  const storeToggleTheme = useUIStore((s) => s?.toggleTheme);

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (e?: MediaQueryListEvent | { matches?: boolean }) => {
      const isDarkMatch = typeof e?.matches === "boolean" ? e.matches : mediaQuery.matches;
      setSystemTheme(isDarkMatch ? "dark" : "light");
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    } else if (typeof (mediaQuery as { addListener?: (fn: () => void) => void }).addListener === "function") {
      (mediaQuery as { addListener: (fn: () => void) => void }).addListener(update);
      return () =>
        (mediaQuery as { removeListener: (fn: () => void) => void }).removeListener(update);
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      storeSetTheme?.(newTheme);
    },
    [storeSetTheme]
  );

  const toggleTheme = useCallback(() => {
    if (storeToggleTheme) {
      storeToggleTheme();
    } else if (storeSetTheme) {
      if (theme === "light") storeSetTheme("dark");
      else if (theme === "dark") storeSetTheme("system");
      else storeSetTheme("light");
    }
  }, [storeToggleTheme, storeSetTheme, theme]);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  return {
    theme,
    resolvedTheme,
    systemTheme,
    isDark,
    mounted,
    setTheme,
    toggleTheme,
  };
}
