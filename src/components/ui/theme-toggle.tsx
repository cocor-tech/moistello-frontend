"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import type { Theme } from "@/stores/ui-store";
import { cn } from "@/lib/cn";

export interface ThemeToggleProps {
  className?: string;
  variant?: "button" | "segmented" | "dropdown";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeClasses = {
  sm: { btn: "h-8 w-8 text-xs", icon: "h-3.5 w-3.5", seg: "px-2 py-1 text-xs" },
  md: { btn: "h-9 w-9 text-sm", icon: "h-4 w-4", seg: "px-3 py-1.5 text-sm" },
  lg: { btn: "h-10 w-10 text-base", icon: "h-5 w-5", seg: "px-4 py-2 text-base" },
};

export function ThemeToggle({
  className,
  variant = "button",
  size = "md",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, systemTheme, isDark, mounted, setTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sizes = sizeClasses[size];

  const renderIcon = (t: Theme, cls = sizes.icon) => {
    if (t === "light") return <Sun className={cn(cls, "text-amber-400")} />;
    if (t === "dark") return <Moon className={cn(cls, "text-indigo-400")} />;
    return <Monitor className={cn(cls, "text-aurora-cyan")} />;
  };

  const label =
    theme === "system"
      ? `Theme: System (${systemTheme}). Click to switch to light mode`
      : theme === "light"
        ? "Theme: Light. Click to switch to dark mode"
        : "Theme: Dark. Click to switch to system theme";

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn("inline-flex items-center justify-center rounded-xl text-muted-foreground", sizes.btn, className)}
        aria-label="Toggle theme"
      >
        <Monitor className={sizes.icon} />
      </button>
    );
  }

  if (variant === "segmented") {
    const opts: { value: Theme; label: string }[] = [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "system", label: "System" },
    ];
    return (
      <div role="group" aria-label="Theme selector" className={cn("inline-flex rounded-xl p-1 bg-white/[0.04] border border-white/[0.08]", className)}>
        {opts.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={theme === opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all",
              sizes.seg,
              theme === opt.value ? "bg-aurora-violet/20 text-aurora-violet shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {renderIcon(opt.value, "h-3.5 w-3.5")}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (variant === "dropdown") {
    const opts: { value: Theme; label: string }[] = [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "system", label: `System (${systemTheme})` },
    ];
    return (
      <div className="relative inline-block" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn("inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-all", sizes.btn, className)}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {renderIcon(theme)}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 mt-2 z-50 min-w-[9rem] rounded-xl p-1.5 bg-background/95 backdrop-blur-xl border border-white/[0.08] shadow-xl">
            {opts.map((opt) => (
              <button
                key={opt.value}
                role="menuitem"
                type="button"
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors",
                  theme === opt.value ? "text-aurora-violet bg-aurora-violet/10 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                )}
              >
                <div className="flex items-center gap-2">{renderIcon(opt.value, "h-3.5 w-3.5")}<span>{opt.label}</span></div>
                {theme === opt.value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-all relative",
        sizes.btn,
        showLabel && "w-auto px-3 gap-2",
        className
      )}
      aria-label={label}
      title={label}
    >
      {renderIcon(theme)}
      {theme === "system" && (
        <span className={cn("absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full", isDark ? "bg-indigo-400" : "bg-amber-400")} aria-hidden="true" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {theme === "system" ? `System (${systemTheme})` : theme === "dark" ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}
