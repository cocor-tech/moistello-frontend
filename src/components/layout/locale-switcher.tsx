"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/lib/locale/context";

const LANGUAGES = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "pt", label: "Português", flag: "🇵🇹" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { value: "ha", label: "Hausa", flag: "🇳🇬" },
  { value: "yo", label: "Yoruba", flag: "🇳🇬" },
  { value: "ig", label: "Igbo", flag: "🇳🇬" },
] as const;

export function LocaleSwitcher() {
  const { locale, setLocale } = useTranslate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const currentLang = LANGUAGES.find((l) => l.value === locale) ?? LANGUAGES[0];

  const close = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  const focusLanguage = (value: string) => {
    optionRefs.current[value]?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = LANGUAGES.findIndex((language) => language.value === locale);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? LANGUAGES.length - 1
        : event.key === "ArrowDown"
          ? Math.min(currentIndex + 1, LANGUAGES.length - 1)
          : Math.max(currentIndex - 1, 0);
    setIsOpen(true);
    window.requestAnimationFrame(() => focusLanguage(LANGUAGES[nextIndex].value));
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, value: string) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = LANGUAGES.findIndex((language) => language.value === value);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? LANGUAGES.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % LANGUAGES.length
          : (currentIndex - 1 + LANGUAGES.length) % LANGUAGES.length;
    focusLanguage(LANGUAGES[nextIndex].value);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  function handleSelect(value: string) {
    setLocale(value);
    close();
    triggerRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="locale-listbox"
        aria-label={`Language: ${currentLang.label}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-xl px-2",
          "text-muted-foreground hover:text-foreground hover:glass-whisper",
          "text-xs font-mono font-medium transition-colors",
        )}
      >
        <span aria-hidden="true">{currentLang.flag}</span>
        <span className="hidden sm:inline tracking-widest uppercase">
          {currentLang.value}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform duration-150", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="locale-listbox"
          role="listbox"
          aria-label="Select language"
          className={cn(
            "absolute right-0 top-full mt-1.5 z-50",
            "w-44 py-1",
            "bg-card border border-border",
            "rounded-xl shadow-lg",
            "overflow-hidden overflow-y-auto max-h-64",
          )}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.value === locale;
            return (
              <button
                key={lang.value}
                ref={(node) => {
                  optionRefs.current[lang.value] = node
                }}
                id={`locale-option-${lang.value}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(lang.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, lang.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {lang.flag}
                </span>
                <span className="flex-1 text-left font-body">{lang.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                  {lang.value}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
