"use client";

import React, {
  forwardRef,
  useId,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  name?: string;
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void;
}

/**
 * Accessible combobox-style Select.
 *
 * Implements the WAI-ARIA combobox + listbox pattern:
 *  - trigger has role="combobox", aria-expanded, aria-controls and
 *    aria-activedescendant pointing at the highlighted option
 *  - listbox exposes role="listbox" with role="option" / aria-selected items
 *  - full keyboard support: ArrowDown/ArrowUp, Home/End, Enter/Space,
 *    Escape, Tab and typeahead (letter keys jump to matching option)
 *  - focus stays on the trigger while the list is open, so screen readers
 *    announce the highlighted option via aria-activedescendant
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder,
      label,
      error,
      hint,
      disabled,
      className,
      id,
      name,
      onFocus,
      onBlur,
    },
    ref,
  ) => {
    const generatedId = useId();
    const listboxId = `${generatedId}-listbox`;
    const selectId = id || generatedId;
    const labelId = `${selectId}-label`;
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint && !error ? `${selectId}-hint` : undefined;

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listboxRef = useRef<HTMLUListElement | null>(null);
    const typeaheadTimer = useRef<number | null>(null);

    const selectedIndex = options.findIndex((o) => o.value === value);
    const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : "";

    const openListbox = useCallback(() => {
      if (disabled) return;
      const startIndex =
        selectedIndex >= 0
          ? selectedIndex
          : options.findIndex((o) => !o.disabled);
      setActiveIndex(startIndex >= 0 ? startIndex : -1);
      setIsOpen(true);
    }, [disabled, options, selectedIndex]);

    const closeListbox = useCallback(
      (returnFocus = true) => {
        setIsOpen(false);
        setActiveIndex(-1);
        if (returnFocus) triggerRef.current?.focus();
      },
      [],
    );

    const selectOption = useCallback(
      (index: number) => {
        const option = options[index];
        if (!option || option.disabled) return;
        onChange?.(option.value);
        closeListbox();
      },
      [options, onChange, closeListbox],
    );

    // ── Typeahead ─────────────────────────────────────────────────────────
    const handleTypeahead = useCallback(
      (char: string) => {
        if (typeaheadTimer.current) window.clearTimeout(typeaheadTimer.current);
        const buffer = char.toLowerCase();
        const matchIndex = options.findIndex((o) =>
          o.label.toLowerCase().startsWith(buffer),
        );
        if (matchIndex >= 0) {
          setActiveIndex(matchIndex);
          if (!isOpen) setIsOpen(true);
        }
        typeaheadTimer.current = window.setTimeout(() => {
          typeaheadTimer.current = null;
        }, 500);
      },
      [options, isOpen],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!isOpen) {
            openListbox();
            return;
          }
          const enabled = options
            .map((o, i) => ({ o, i }))
            .filter((x) => !x.o.disabled);
          const currentPos = enabled.findIndex((x) => x.i === activeIndex);
          const next = enabled[(currentPos + 1) % enabled.length];
          if (next) setActiveIndex(next.i);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!isOpen) {
            openListbox();
            return;
          }
          const enabled = options
            .map((o, i) => ({ o, i }))
            .filter((x) => !x.o.disabled);
          const currentPos = enabled.findIndex((x) => x.i === activeIndex);
          const next =
            enabled[
              (currentPos - 1 + enabled.length) % enabled.length
            ];
          if (next) setActiveIndex(next.i);
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          if (!isOpen) openListbox();
          setActiveIndex(options.findIndex((o) => !o.disabled));
          return;
        }
        if (e.key === "End") {
          e.preventDefault();
          if (!isOpen) openListbox();
          const enabled = options
            .map((o, i) => ({ o, i }))
            .filter((x) => !x.o.disabled);
          setActiveIndex(enabled[enabled.length - 1]?.i ?? -1);
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isOpen) {
            openListbox();
            return;
          }
          if (activeIndex >= 0) selectOption(activeIndex);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeListbox();
          return;
        }
        if (e.key === "Tab") {
          closeListbox(false);
          return;
        }
        if (/^[\p{L}\p{N}]$/u.test(e.key)) {
          e.preventDefault();
          handleTypeahead(e.key);
        }
      },
      [
        isOpen,
        options,
        activeIndex,
        openListbox,
        closeListbox,
        selectOption,
        handleTypeahead,
      ],
    );

    // Click-outside + scroll-resize handling
    useEffect(() => {
      if (!isOpen) return;
      const handlePointerDown = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (
          listboxRef.current?.contains(target) ||
          triggerRef.current?.contains(target)
        ) {
          return;
        }
        closeListbox(false);
      };
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    }, [isOpen, closeListbox]);

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const activeOptionId =
      isOpen && activeIndex >= 0
        ? `${selectId}-option-${activeIndex}`
        : undefined;

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLButtonElement>) => onFocus?.(e),
      [onFocus],
    );
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLButtonElement>) => onBlur?.(e),
      [onBlur],
    );

    return (
      <div className="w-full">
        {label && (
          <label
            id={labelId}
            htmlFor={selectId}
            className="mb-2 block font-heading text-xs tracking-wider uppercase text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <button
            ref={setRefs}
            type="button"
            id={selectId}
            name={name}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-activedescendant={activeOptionId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId || hintId || undefined}
            aria-label={!label ? placeholder : undefined}
            aria-labelledby={label ? labelId : undefined}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={() => (isOpen ? closeListbox() : openListbox())}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 bg-transparent px-3 py-2 text-left text-base md:text-sm text-foreground",
              "border-b-2 border-border",
              "transition-all duration-300 rounded-none",
              "focus:outline-none focus-visible:border-b-aurora-violet focus-visible:shadow-[0_0_12px_rgb(var(--aurora-violet)/0.1)]",
              isOpen && "border-b-aurora-violet",
              "disabled:cursor-not-allowed disabled:opacity-40",
              error && "border-b-red-500 shadow-[0_0_12px_rgb(239_68_68/0.1)]",
              className,
            )}
          >
            <span
              className={cn(
                "truncate",
                selectedLabel ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {selectedLabel || placeholder}
            </span>
            <span
              className={cn(
                "pointer-events-none shrink-0 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180",
              )}
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>

          {isOpen && (
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={label ? labelId : undefined}
              aria-label={!label ? placeholder : undefined}
              tabIndex={-1}
              className="absolute z-50 mt-1 max-h-60 w-full min-w-[180px] overflow-y-auto rounded-xl border border-white/10 bg-background p-1 shadow-xl shadow-black/40"
            >
              {options.length === 0 && (
                <li
                  role="option"
                  aria-selected="false"
                  aria-disabled="true"
                  className="px-3 py-2 text-sm text-muted-foreground"
                >
                  No options
                </li>
              )}
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={option.value}
                    id={`${selectId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    onClick={() => selectOption(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectOption(index);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-body transition-colors duration-150",
                      isActive
                        ? "bg-aurora-violet/15 text-foreground"
                        : "text-foreground/80",
                      isSelected && "text-aurora-violet",
                      option.disabled &&
                        "cursor-not-allowed opacity-40 hover:bg-transparent",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <span className="ml-2 text-aurora-violet" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-2xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
