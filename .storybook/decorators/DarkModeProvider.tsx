"use client";

/**
 * The Moistello app renders dark-first (see the inline theme script in the
 * root layout). Storybook boots outside Next, so we force the `.dark` class on
 * <html> so tokens, glass surfaces and text colors render exactly as they do
 * in the product. Individual stories that want to show the light theme can
 * remove the class inside their own decorator.
 */
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-density", "comfortable");
    document.documentElement.setAttribute("data-font-size", "medium");
  }
  return <>{children}</>;
}